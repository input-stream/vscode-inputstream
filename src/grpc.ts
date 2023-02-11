import * as grpc from '@grpc/grpc-js';
import * as loader from '@grpc/proto-loader';
import * as vscode from 'vscode';

import { ButtonName } from './views';

const perCallAuthorizationBearer = false;

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
    // const callCreds = grpc.credentials.createFromMetadataGenerator((_params, callback) => {
    //     const md = new grpc.Metadata({
    //         waitForReady: true,
    //     });
    //     const bearer = supplyToken();
    //     if (bearer) {
    //         md.add('Authorization', `Bearer ${bearer}`);
    //     }
    //     callback(null, md);
    // });
    // const creds = grpc.credentials.combineChannelCredentials(channelCreds, callCreds);
    return channelCreds;
}

export function createClientOptions(token: TokenRefresher, options?: grpc.ClientOptions): grpc.ClientOptions {
    const opts: grpc.ClientOptions = options ? options : {};
    // if (true) {
    //     opts.interceptors = [createClientCallRetryInterceptor(token)];
    // }
    return opts;
}

export class AuthenticatingGrpcClient<T extends grpc.Client> implements vscode.Disposable {

    constructor(
        protected client: T,
        private ctx?: ClientContext | undefined,
    ) {
    }

    public dispose(): void {
        this.client.close();
    }

    protected createCallMetadata(): grpc.Metadata {
        const md = new grpc.Metadata();
        if (perCallAuthorizationBearer && this.ctx) {
            const token = this.ctx.accessToken();
            if (token) {
                if (md.get('Authorization').length === 0) {
                    md.add('Authorization', `Bearer ${this.ctx.accessToken()}`);
                }
            }
        }
        return md;
    }

    /**
     * Execute a grpc unary call having response type S.  If the call fails,
     * user will be prompted to retry up to the limit (defaults to 2).
     *
     * @param fn The function to invoke during an attempt.  Should return the
     * response type or fail to a grpc.ServiceError.
     * @param limit Max number of retries.
     */
    async unaryCall<S>(desc: string, fn: () => Promise<S>, limit = 2, silent = false): Promise<S> {
        try {
            return await fn();
        } catch (e) {
            const err = e as grpc.ServiceError;

            // Reached terminal attempt, report error and bail
            if (limit === 0) {
                if (!silent) {
                    vscode.window.showErrorMessage(`${desc}: ${err.message} (operation will not be retried)`);
                }
                throw err;
            }

            // Attempt to refresh the token if we are unauthenticated
            if (err.code === grpc.status.UNAUTHENTICATED) {
                if (this.ctx) {
                    try {
                        await this.ctx.refreshAccessToken();
                        return this.unaryCall(desc, fn, Math.max(0, limit - 1));
                    } catch (e2) {
                        if (!silent) {
                            vscode.window.showWarningMessage('Could not refresh access token: ' + JSON.stringify(e2));
                        }
                    }
                }
            }

            // Prompt user to retry
            if (!silent) {
                const action = await vscode.window.showInformationMessage(
                    `${desc} failed: ${err.message} (${limit} attempts remaining)`,
                    ButtonName.Retry, ButtonName.Cancel);
                if (action !== ButtonName.Retry) {
                    throw err;
                }
            }

            return this.unaryCall(desc, fn, Math.max(0, limit - 1), silent);
        }
    }

}
