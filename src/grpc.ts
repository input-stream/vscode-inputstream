import * as grpc from '@grpc/grpc-js';
import * as loader from '@grpc/proto-loader';

import { createClientCallRetryInterceptor } from './interceptors';

export function loadProtoPackage<T>(protofile: string): T {
    const protoPackage = loader.loadSync(protofile, {
        keepCase: false,
        defaults: false,
        oneofs: true
    });
    return grpc.loadPackageDefinition(protoPackage) as unknown as T;
}


/**
 * TokenSupplier is a function that produces the current access token.
 */
export type TokenSupplier = () => string | undefined;

/**
 * TokenRefresher is a function that does work to produce a new access token.
 */
export type TokenRefresher = () => Promise<string | undefined>;

/**
 * ClientContext is a convenience struct to build clients.
 */
export interface ClientContext {
    accessToken: TokenSupplier,
    refreshAccessToken: TokenRefresher,
    options?: grpc.ClientOptions,
}

export function createDeadline(seconds = 15): grpc.Deadline {
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + seconds);
    return deadline;
}

export function createChannelCredentials(address: string): grpc.ChannelCredentials {
    if (address.endsWith(':443')) {
        return grpc.credentials.createSsl();
    }
    return grpc.credentials.createInsecure();
}

export function createCredentials(address: string, supplyToken: TokenSupplier): grpc.ChannelCredentials {
    const channelCreds = createChannelCredentials(address);
    if (!channelCreds._isSecure()) {
        return channelCreds;
    }
    const callCreds = grpc.credentials.createFromMetadataGenerator((_params, callback) => {
        const md = new grpc.Metadata({
            waitForReady: true,
        });
        const bearer = supplyToken();
        if (bearer) {
            md.add('Authorization', `Bearer ${bearer}`);
        }
        callback(null, md);
    });
    const creds = grpc.credentials.combineChannelCredentials(channelCreds, callCreds);
    return creds;
}

export function createClientOptions(token: TokenRefresher, options?: grpc.ClientOptions): grpc.ClientOptions {
    const opts: grpc.ClientOptions = options ? options : {};
    // TOOD: pcj: re-enable client interceptor once you fix the server streaming
    // opts.interceptors = [createClientCallRetryInterceptor(token)];
    return opts;
}
