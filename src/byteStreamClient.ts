import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import { createDeadline } from './grpc';

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

export class ByteStreamGrpcClient implements IByteStreamClient, vscode.Disposable {

    constructor(
        private client: ByteStreamClient,
        private timeoutSecs = 300, /* five minutes */
    ) {
    }

    read(request: ReadRequest): grpc.ClientReadableStream<ReadResponse> {
        return this.client.read(request, { deadline: createDeadline(this.timeoutSecs) });
    }

    write(onResponse: (error?: grpc.ServiceError | null, out?: WriteResponse | undefined) => void, extraMd?: grpc.Metadata): grpc.ClientWritableStream<WriteRequest> {
        if (extraMd) {
            return this.client.write(extraMd, { deadline: createDeadline() }, onResponse);
        } else {
            return this.client.write({ deadline: createDeadline(this.timeoutSecs) }, onResponse);
        }
    }

    queryWriteStatus(req: QueryWriteStatusRequest): Promise<QueryWriteStatusResponse> {
        return new Promise<QueryWriteStatusResponse>((resolve, reject) => {
            this.client.QueryWriteStatus(
                req,
                { deadline: createDeadline() }, // should not need extra time
                (err: grpc.ServiceError | null, resp?: QueryWriteStatusResponse) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(resp!);
                    }
                });
        });
    }

    public dispose(): void {
        this.client.close();
    }

}
