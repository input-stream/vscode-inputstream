import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';

export interface Closeable {
    close(): void;
}

export class GRPCClient implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private closeables: Closeable[] = [];

    constructor(
        readonly address: string,
        protected defaultDeadlineSeconds = 30,
    ) {
    }

    protected getCredentials(address: string): grpc.ChannelCredentials {
        if (address.endsWith(':443')) {
            return grpc.credentials.createSsl();
        }
        return grpc.credentials.createInsecure();
    }

    protected getDeadline(seconds?: number): grpc.Deadline {
        const deadline = new Date();
        deadline.setSeconds(deadline.getSeconds()
            + (seconds || this.defaultDeadlineSeconds));
        return deadline;
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

    protected add<T extends Closeable>(client: T): T {
        this.closeables.push(client);
        return client;
    }

    public dispose() {
        for (const closeable of this.closeables) {
            closeable.close();
        }
        this.closeables.length = 0;
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
    }

}
