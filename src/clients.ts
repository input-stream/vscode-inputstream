import * as grpc from '@grpc/grpc-js';
import * as loader from '@grpc/proto-loader';

import { ProtoGrpcType as AuthProtoType } from './proto/auth';
import { AuthServiceClient } from './proto/build/stack/auth/v1beta1/AuthService';
import { InputsClient } from './proto/build/stack/inputstream/v1beta1/Inputs';
import { ProtoGrpcType as ByteStreamProtoType } from './proto/bytestream';
import { ProtoGrpcType as InputStreamProtoType } from './proto/inputstream';
import { Status } from "@grpc/grpc-js/build/src/constants";
import { NextCall } from '@grpc/grpc-js/build/src/client-interceptors';
import { FullListener, InterceptingListener, MessageListener } from '@grpc/grpc-js/build/src/call-interface';


export type UnaryCallOptions = {
    limit: number;
    silent: boolean;
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

function createChannelCredentials(address: string): grpc.ChannelCredentials {
    if (address.endsWith(':443')) {
        return grpc.credentials.createSsl();
    }
    return grpc.credentials.createInsecure();
}

function createCredentials(address: string, tokenProvider: () => string | undefined): grpc.ChannelCredentials {
    const channelCreds = createChannelCredentials(address);
    const callCreds = grpc.credentials.createFromMetadataGenerator((_params, callback) => {
        const md = new grpc.Metadata({
            waitForReady: true,
        });
        const token = tokenProvider();
        if (token) {
            md.add('Authorization', `Bearer ${token}`);
        }
        callback(null, md);
    });
    const creds = grpc.credentials.combineChannelCredentials(channelCreds, callCreds);
    return creds;
}

/**
 * Create a new client for the Inputs service.
 * 
 * @param address The address to connect.
 */
export function createInputsClient(proto: InputStreamProtoType, address: string, tokenProvider: () => string | undefined, options?: grpc.ClientOptions): InputsClient {
    const creds = createCredentials(address, tokenProvider);
    return new proto.build.stack.inputstream.v1beta1.Inputs(address, creds, options);
}

/**
 * Create a new client for the Auth service.
 * 
 * @param address The address to connect.
 */
export function createAuthServiceClient(proto: AuthProtoType, address: string): AuthServiceClient {
    return new proto.build.stack.auth.v1beta1.AuthService(address, createChannelCredentials(address));
}

export type GrpcMethodType = "unary" | "client_stream" | "server_stream" | "bidi_stream";

export interface IGrpcCallMetricsLabels {
    service: string;
    method: string;
    type: GrpcMethodType;
}

export interface IGrpcCallMetricsLabelsWithCode extends IGrpcCallMetricsLabels {
    code: string;
}

export const IClientCallMetrics = Symbol("IClientCallMetrics");


export interface IClientCallMetrics {
    started(labels: IGrpcCallMetricsLabels): void;
    sent(labels: IGrpcCallMetricsLabels): void;
    received(labels: IGrpcCallMetricsLabels): void;
    handled(labels: IGrpcCallMetricsLabelsWithCode): void;
    startHandleTimer(
        labels: IGrpcCallMetricsLabels,
    ): (labels?: Partial<Record<string, string | number>> | undefined) => number;
}

export function getGrpcMethodType(requestStream: boolean, responseStream: boolean): GrpcMethodType {
    if (requestStream) {
        if (responseStream) {
            return "bidi_stream";
        } else {
            return "client_stream";
        }
    } else {
        if (responseStream) {
            return "server_stream";
        } else {
            return "unary";
        }
    }
}

export function createClientCallMetricsInterceptor(metrics: IClientCallMetrics): grpc.Interceptor {
    return (options: grpc.InterceptorOptions, nextCall: NextCall): grpc.InterceptingCall => {
        const methodDef = options.method_definition;
        const method = methodDef.path.substring(methodDef.path.lastIndexOf("/") + 1);
        const service = methodDef.path.substring(1, methodDef.path.length - method.length - 1);
        const labels = {
            service,
            method,
            type: getGrpcMethodType(options.method_definition.requestStream, options.method_definition.responseStream),
        };
        const requester = new grpc.RequesterBuilder()
            .withStart((metadata, listener, next) => {
                const newListener = new grpc.ListenerBuilder()
                    .withOnReceiveStatus((status, next) => {
                        try {
                            metrics.handled({
                                ...labels,
                                code: Status[status.code],
                            });
                        } finally {
                            next(status);
                        }
                    })
                    .withOnReceiveMessage((message, next) => {
                        try {
                            metrics.received(labels);
                        } finally {
                            next(message);
                        }
                    })
                    .build();
                try {
                    metrics.started(labels);
                } finally {
                    next(metadata, newListener);
                }
            })
            .withSendMessage((message, next) => {
                try {
                    metrics.sent(labels);
                } finally {
                    next(message);
                }
            })
            .build();
        return new grpc.InterceptingCall(nextCall(options), requester);
    };
}

type NextCallback = (md: grpc.Metadata, listener: InterceptingListener | Partial<FullListener>) => void;
type NextStatus = (status: grpc.StatusObject) => void;
type NextMessage = (message: any) => void;

export function createClientCallRetryInterceptor(refreshToken: () => Promise<string>, maxRetries = 3): grpc.Interceptor {
    return (options: grpc.InterceptorOptions, nextCall: NextCall): grpc.InterceptingCall => {
        let savedMetadata: grpc.Metadata;
        let savedSendMessage: any;
        let savedReceiveMessage: MessageListener;
        let savedMessageNext: NextMessage;

        const requester = new grpc.RequesterBuilder()
            .withStart((metadata: grpc.Metadata, _listener: InterceptingListener, next: NextCallback) => {
                savedMetadata = metadata;

                const newListener = new grpc.ListenerBuilder()
                    .withOnReceiveStatus((status: grpc.StatusObject, next: NextStatus) => {
                        let retries = 0;
                        const retry = (message: any, next: NextStatus) => {
                            retries++;
                            var newCall = nextCall(options);
                            newCall.start(metadata, {
                                onReceiveMessage: function (message: any) {
                                    savedReceiveMessage = message;
                                },
                                onReceiveStatus: (status: grpc.StatusObject) => {
                                    if (status.code !== grpc.status.OK) {
                                        if (retries <= maxRetries) {
                                            retry(message, next);
                                        } else {
                                            savedMessageNext(savedReceiveMessage);
                                            next(status);
                                        }
                                    } else {
                                        savedMessageNext(savedReceiveMessage);
                                        next(status);
                                    }
                                }
                            });
                        }
                    })
                    .withOnReceiveMessage((message: MessageListener, next: NextMessage) => {
                        savedReceiveMessage = message;
                        savedMessageNext = next;
                    })
                    .build();

                next(metadata, newListener);
            })
            .withSendMessage((message: any, next: NextMessage) => {
                savedSendMessage = message;
                next(message);
            })
            .build();
        return new grpc.InterceptingCall(nextCall(options), requester);
    };
}