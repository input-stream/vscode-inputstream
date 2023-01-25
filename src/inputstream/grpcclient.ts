import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';

import { AccessTokenRefresher } from './deviceLogin';
import { ButtonName } from './constants';

export interface Closeable {
    close(): void;
}

export type UnaryCallOptions = {
    limit: number;
    silent: boolean;
}

export function makeChannelCredentials(address: string): grpc.ChannelCredentials {
    if (address.endsWith(':443')) {
        return grpc.credentials.createSsl();
    }
    return grpc.credentials.createInsecure();
}

export class GRPCClient<T extends grpc.Client> implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private token: string | undefined;

    constructor(
        protected readonly client: T,
        private readonly refresher?: AccessTokenRefresher,
        private defaultDeadlineSeconds = 30,
    ) {
    }

    public setToken(token: string): void {
        this.token = token;
    }

    public getGrpcMetadata(): grpc.Metadata {
        const md = new grpc.Metadata({
            waitForReady: true,
        });
        md.add('Authorization', `Bearer ${this.token}`);
        return md;
    }

    protected getDeadline(seconds?: number): grpc.Deadline {
        const deadline = new Date();
        deadline.setSeconds(deadline.getSeconds()
            + (seconds || this.defaultDeadlineSeconds));
        return deadline;
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
                if (this.refresher) {
                    try {
                        await this.refresher.refreshAccessToken();
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

    protected handleError(err: grpc.ServiceError): grpc.ServiceError {
        if (err.code === grpc.status.UNAVAILABLE) {
            return this.handleErrorUnavailable(err);
        }
        if (err.code === grpc.status.UNAUTHENTICATED) {
            return this.handleErrorUnauthenticated(err);
        }
        if (err.code === grpc.status.DEADLINE_EXCEEDED) {
            return this.handleErrorDeadlineExceeded(err);
        }
        return err;
    }

    protected handleErrorUnavailable(err: grpc.ServiceError): grpc.ServiceError {
        return err;
    }

    protected handleErrorUnauthenticated(err: grpc.ServiceError): grpc.ServiceError {
        return err;
    }

    protected handleErrorDeadlineExceeded(err: grpc.ServiceError): grpc.ServiceError {
        return err;
    }

    public dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
    }

    close(): void {
        this.client.close();
    }

}
