import * as grpc from '@grpc/grpc-js';
import * as loader from '@grpc/proto-loader';

import { ProtoGrpcType as AuthProtoType } from './proto/auth';
import { AuthServiceClient } from './proto/build/stack/auth/v1beta1/AuthService';
import { InputsClient } from './proto/build/stack/inputstream/v1beta1/Inputs';
import { ProtoGrpcType as ByteStreamProtoType } from './proto/bytestream';
import { ProtoGrpcType as InputStreamProtoType } from './proto/inputstream';
import { NextCall } from '@grpc/grpc-js/build/src/client-interceptors';
import { FullListener, InterceptingListener, MessageListener } from '@grpc/grpc-js/build/src/call-interface';
import { ByteStreamClient } from './proto/google/bytestream/ByteStream';
import { ImagesClient } from './proto/build/stack/inputstream/v1beta1/Images';

type TokenSupplier = () => string | undefined;
type TokenRefresher = () => Promise<string | undefined>;

export interface ClientContext {
    token: TokenSupplier,
    refreshToken: TokenRefresher,
    options?: grpc.ClientOptions,
}

export function loadAuthProtos(protofile: string): AuthProtoType {
    const protoPackage = loader.loadSync(protofile, {
        keepCase: false,
        defaults: false,
        oneofs: true
    });
    return grpc.loadPackageDefinition(protoPackage) as unknown as AuthProtoType;
}

export function loadInputStreamProtos(protofile: string): InputStreamProtoType {
    const protoPackage = loader.loadSync(protofile, {
        keepCase: false,
        defaults: false,
        oneofs: true
    });
    return grpc.loadPackageDefinition(protoPackage) as unknown as InputStreamProtoType;
}

export function loadByteStreamProtos(protofile: string): ByteStreamProtoType {
    const protoPackage = loader.loadSync(protofile, {
        keepCase: false,
        defaults: false,
        oneofs: true
    });
    return grpc.loadPackageDefinition(protoPackage) as unknown as ByteStreamProtoType;
}

export function createDeadline(seconds = 15): grpc.Deadline {
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + seconds);
    return deadline;
}

function createChannelCredentials(address: string): grpc.ChannelCredentials {
    if (address.endsWith(':443')) {
        return grpc.credentials.createSsl();
    }
    return grpc.credentials.createInsecure();
}

function createCredentials(address: string, token: TokenSupplier): grpc.ChannelCredentials {
    const channelCreds = createChannelCredentials(address);
    const callCreds = grpc.credentials.createFromMetadataGenerator((_params, callback) => {
        const md = new grpc.Metadata({
            waitForReady: true,
        });
        const bearer = token();
        if (bearer) {
            md.add('Authorization', `Bearer ${bearer}`);
        }
        callback(null, md);
    });
    const creds = grpc.credentials.combineChannelCredentials(channelCreds, callCreds);
    return creds;
}

function createClientOptions(token: TokenRefresher, options?: grpc.ClientOptions): grpc.ClientOptions {
    const opts: grpc.ClientOptions = options ? options : {};
    opts.interceptors = [createClientCallRetryInterceptor(token)];
    return opts;
}

/**
 * Create a new client for the Auth service.
 * 
 * @param address The address to connect.
 */
export function createAuthServiceClient(proto: AuthProtoType, address: string): AuthServiceClient {
    return new proto.build.stack.auth.v1beta1.AuthService(address, createChannelCredentials(address));
}

/**
 * Create a new client for the Inputs service.
 * 
 * @param address The address to connect.
 */
export function createInputsClient(proto: InputStreamProtoType, address: string, ctx: ClientContext): InputsClient {
    const creds = createCredentials(address, ctx.token);
    const options = createClientOptions(ctx.refreshToken, ctx.options);
    return new proto.build.stack.inputstream.v1beta1.Inputs(address, creds, options);
}

/**
 * Create a new client for the Inputs service.
 * 
 * @param address The address to connect.
 */
export function createImagesClient(proto: InputStreamProtoType, address: string, ctx: ClientContext): ImagesClient {
    const creds = createCredentials(address, ctx.token);
    const options = createClientOptions(ctx.refreshToken, ctx.options);
    return new proto.build.stack.inputstream.v1beta1.Images(address, creds, options);
}


/**
 * Create a new client for the Bytestream service.
 * 
 * @param address The address to connect.
 */
export function createBytestreamClient(proto: ByteStreamProtoType, address: string, ctx: ClientContext): ByteStreamClient {
    const creds = createCredentials(address, ctx.token);
    const options = createClientOptions(ctx.refreshToken, ctx.options);
    return new proto.google.bytestream.ByteStream(address, creds, options);
}

type NextCallback = (md: grpc.Metadata, listener: InterceptingListener | Partial<FullListener>) => void;
type NextStatus = (status: grpc.StatusObject) => void;
type NextMessage = (message: any) => void;

export function createClientCallRetryInterceptor(refreshToken: TokenRefresher, maxRetries = 3): grpc.Interceptor {
    return (options: grpc.InterceptorOptions, nextCall: NextCall): grpc.InterceptingCall => {
        let savedMetadata: grpc.Metadata;
        let savedSendMessage: any;
        let savedReceiveMessage: MessageListener;
        let savedMessageNext: NextMessage;

        const requester = new grpc.RequesterBuilder()
            .withStart((startMetadata: grpc.Metadata, _listener: InterceptingListener, nextCallback: NextCallback) => {
                savedMetadata = startMetadata;

                const newListener = new grpc.ListenerBuilder()
                    .withOnReceiveStatus((status: grpc.StatusObject, nextStatus: NextStatus) => {
                        let retries = 0;

                        const retry = (retriedMessage: any, retriedMetadata: grpc.Metadata) => {
                            retries++;
                            const newCall = nextCall(options);
                            newCall.start(retriedMetadata, {
                                onReceiveMessage: function (message: any) {
                                    savedReceiveMessage = message;
                                },
                                onReceiveStatus: (status: grpc.StatusObject) => {
                                    if (status.code !== grpc.status.OK) {
                                        if (retries <= maxRetries) {
                                            retry(retriedMessage, retriedMetadata);
                                        } else {
                                            savedMessageNext(savedReceiveMessage);
                                            nextStatus(status);
                                        }
                                    } else {
                                        savedMessageNext(savedReceiveMessage);
                                        nextStatus(status);
                                    }
                                }
                            });
                        };

                        if (status.code !== grpc.status.OK) {
                            retry(savedSendMessage, savedMetadata);
                        } else {
                            savedMessageNext(savedReceiveMessage);
                            nextStatus(status);
                        }

                    })
                    .withOnReceiveMessage((message: MessageListener, next: NextMessage) => {
                        savedReceiveMessage = message;
                        savedMessageNext = next;
                    })
                    .build();

                nextCallback(startMetadata, newListener);
            })
            .withSendMessage((message: any, next: NextMessage) => {
                savedSendMessage = message;
                next(message);
            })
            .build();

        return new grpc.InterceptingCall(nextCall(options), requester);
    };
}
