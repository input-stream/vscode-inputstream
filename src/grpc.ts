import * as grpc from '@grpc/grpc-js';
import * as loader from '@grpc/proto-loader';
import * as vscode from 'vscode';

import { AuthorizationBearerInterceptor } from './interceptors';

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
    return channelCreds;
}

export function createClientOptions(ctx: ClientContext, options?: grpc.ClientOptions): grpc.ClientOptions {
    const opts: grpc.ClientOptions = options ? options : {};
    const maxRetries = 1;
    const authInteceptor = new AuthorizationBearerInterceptor(ctx, maxRetries);
    opts.interceptors = [authInteceptor.entrypoint];
    return opts;
}

export class GrpcClient<T extends grpc.Client> implements vscode.Disposable {

    constructor(
        protected client: T,
    ) {
    }

    public dispose(): void {
        this.client.close();
    }

}

export class AuthenticatingGrpcClient<T extends grpc.Client> extends GrpcClient<T> {
    constructor(
        client: T,
        private ctx?: ClientContext | undefined,
    ) {
        super(client);
    }

    protected createCallMetadata(): grpc.Metadata {
        const md = new grpc.Metadata();
        if (this.ctx) {
            const token = this.ctx.accessToken();
            if (token) {
                if (md.get('Authorization').length === 0) {
                    md.add('Authorization', `Bearer ${this.ctx.accessToken()}`);
                }
            }
        }
        return md;
    }

}
