import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';

import { GRPCClient } from './grpcclient';
import { AccessTokenRefresher } from './loginController';
import { ByteStreamClient } from './proto/google/bytestream/ByteStream';
import { QueryWriteStatusRequest } from './proto/google/bytestream/QueryWriteStatusRequest';
import { QueryWriteStatusResponse } from './proto/google/bytestream/QueryWriteStatusResponse';
import { ReadRequest } from './proto/google/bytestream/ReadRequest';
import { ReadResponse } from './proto/google/bytestream/ReadResponse';
import { WriteRequest } from './proto/google/bytestream/WriteRequest';
import { WriteResponse } from './proto/google/bytestream/WriteResponse';


export interface IByteStreamClient {
    read(request: ReadRequest, extraMd?: grpc.Metadata): grpc.ClientReadableStream<ReadResponse>;
    write(onResponse: (error?: grpc.ServiceError | null, out?: WriteResponse | undefined) => void, extraMd?: grpc.Metadata): grpc.ClientWritableStream<WriteRequest>;
}

export class ByteStreamGRPCClient extends GRPCClient<ByteStreamClient> implements IByteStreamClient, vscode.Disposable {

    constructor(
        client: ByteStreamClient,
        refresher: AccessTokenRefresher,
        timeout = 300, /* five minute default timeout */
    ) {
        super(client, refresher, timeout);
    }

    queryWriteStatus(req: QueryWriteStatusRequest): Promise<QueryWriteStatusResponse> {
        return this.unaryCall<QueryWriteStatusResponse>('QueryWriteStatus', (): Promise<QueryWriteStatusResponse> => {
            return new Promise<QueryWriteStatusResponse>((resolve, reject) => {
                this.client.queryWriteStatus(
                    req,
                    this.getGrpcMetadata(),
                    { deadline: this.getDeadline() },
                    (err: grpc.ServiceError | null, resp?: QueryWriteStatusResponse) => {
                        if (err) {
                            reject(this.handleError(err));
                        } else {
                            resolve(resp!);
                        }
                    });
            });
        });
    }

    write(onResponse: (error?: grpc.ServiceError | null, out?: WriteResponse | undefined) => void, extraMd?: grpc.Metadata): grpc.ClientWritableStream<WriteRequest> {
        const md = this.getGrpcMetadata();
        if (extraMd) {
            md.merge(extraMd);
        }
        return this.client.write(md, { deadline: this.getDeadline() }, onResponse);
    }

    read(request: ReadRequest, extraMd?: grpc.Metadata): grpc.ClientReadableStream<ReadResponse> {
        const md = this.getGrpcMetadata();
        if (extraMd) {
            md.merge(extraMd);
        }
        return this.client.read(request, md, { deadline: this.getDeadline() });
    }

    public dispose(): void {
        this.client.close();
    }

}
