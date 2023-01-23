import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import { ProtoGrpcType as bytestreamProtoGrpcType } from '../proto/bytestream';
import { GRPCClient } from './grpcclient';
import { ButtonName } from './constants';
import { ByteStreamClient } from '../proto/google/bytestream/ByteStream';
import { WriteRequest } from '../proto/google/bytestream/WriteRequest';
import { WriteResponse } from '../proto/google/bytestream/WriteResponse';
import { QueryWriteStatusRequest } from '../proto/google/bytestream/QueryWriteStatusRequest';
import { QueryWriteStatusResponse } from '../proto/google/bytestream/QueryWriteStatusResponse';
import { ReadResponse } from '../proto/google/bytestream/ReadResponse';
import { ReadRequest } from '../proto/google/bytestream/ReadRequest';

export interface IByteStreamClient {
    read(request: ReadRequest, extraMd?: grpc.Metadata): grpc.ClientReadableStream<ReadResponse>;
    write(onResponse: (error?: grpc.ServiceError | null, out?: WriteResponse | undefined) => void, extraMd?: grpc.Metadata): grpc.ClientWritableStream<WriteRequest>;
}

export class BytestreamClientImpl extends GRPCClient {
    private readonly bytestreamClient: ByteStreamClient;

    constructor(
        readonly proto: bytestreamProtoGrpcType,
        readonly address: string,
        private token: string,
        readonly refreshAccessToken: () => Promise<void>,
    ) {
        super(address, 300 /* five minute timeout */);

        const creds = this.getCredentials(address);
        this.bytestreamClient = this.add(
            new proto.google.bytestream.ByteStream(address, creds)
        );
    }

    /**
     * Execute a grpc unary call having response type S.  If the call fails,
     * user will be prompted to retry up to the limit (defaults to 2).
     *
     * @param fn The function to invoke during an attempt.  Should return the
     * response type or fail to a grpc.ServiceError.
     * @param limit Max number of retries.
     */
    async unaryCall<S>(desc: string, fn: () => Promise<S>, limit = 2): Promise<S> {
        try {
            return await fn();
        } catch (e) {
            const err = e as grpc.ServiceError;

            // Reached terminal attempt, report error and bail
            if (limit === 0) {
                vscode.window.showErrorMessage(`${desc}: ${err.message} (operation will not be retried)`);
                throw err;
            }

            // Attempt to refresh the token if we are unauthenticated
            if (err.code === grpc.status.UNAUTHENTICATED) {
                try {
                    await this.refreshAccessToken();
                    return this.unaryCall(desc, fn, Math.max(0, limit - 1));
                } catch (e2) {
                    vscode.window.showWarningMessage('Could not refresh access token: ' + JSON.stringify(e2));
                }
            }

            // Prompt user to retry
            const action = await vscode.window.showInformationMessage(
                `${desc} failed: ${err.message} (${limit} attempts remaining)`,
                ButtonName.Retry, ButtonName.Cancel);
            if (action !== ButtonName.Retry) {
                throw err;
            }

            return this.unaryCall(desc, fn, Math.max(0, limit - 1));
        }
    }

    write(onResponse: (error?: grpc.ServiceError | null, out?: WriteResponse | undefined) => void, extraMd?: grpc.Metadata): grpc.ClientWritableStream<WriteRequest> {
        const md = this.getGrpcMetadata();
        if (extraMd) {
            md.merge(extraMd);
        }
        return this.bytestreamClient.write(md, { deadline: this.getDeadline() }, onResponse);
    }

    read(request: ReadRequest, extraMd?: grpc.Metadata): grpc.ClientReadableStream<ReadResponse> {
        const md = this.getGrpcMetadata();
        if (extraMd) {
            md.merge(extraMd);
        }
        return this.bytestreamClient.read(request, md, { deadline: this.getDeadline() });
    }

    async queryWriteStatus(req: QueryWriteStatusRequest): Promise<QueryWriteStatusResponse> {
        return this.unaryCall<QueryWriteStatusResponse>('QueryWriteStatus', (): Promise<QueryWriteStatusResponse> => {
            return new Promise<QueryWriteStatusResponse>((resolve, reject) => {
                this.bytestreamClient.queryWriteStatus(
                    req,
                    this.getGrpcMetadata(),
                    { deadline: this.getDeadline() },
                    async (err: grpc.ServiceError | null, resp?: QueryWriteStatusResponse) => {
                        if (err) {
                            reject(this.handleError(err));
                        } else {
                            resolve(resp!);
                        }
                    });
            });
        });
    }

    getGrpcMetadata(): grpc.Metadata {
        const md = new grpc.Metadata({
            waitForReady: true,
        });
        md.add('Authorization', `Bearer ${this.token}`);
        return md;
    }

}
