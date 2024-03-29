import * as grpc from '@grpc/grpc-js';

import { AuthenticatingGrpcClient, ClientContext, createDeadline } from './grpc';
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

export class ByteStreamGrpcClient extends AuthenticatingGrpcClient<ByteStreamClient> implements IByteStreamClient {
    constructor(
        client: ByteStreamClient,
        ctx: ClientContext,
        private timeoutSecs = 300, /* five minutes */
    ) {
        super(client, ctx);
    }

    read(request: ReadRequest): grpc.ClientReadableStream<ReadResponse> {
        return this.client.read(request, this.createCallMetadata());
    }

    write(onResponse: (error?: grpc.ServiceError | null, out?: WriteResponse | undefined) => void): grpc.ClientWritableStream<WriteRequest> {
        const options = { deadline: createDeadline(this.timeoutSecs) };
        return this.client.write(this.createCallMetadata(), options, onResponse);
    }

    queryWriteStatus(req: QueryWriteStatusRequest): Promise<QueryWriteStatusResponse> {
        return new Promise<QueryWriteStatusResponse>((resolve, reject) => {
            this.client.QueryWriteStatus(
                req,
                this.createCallMetadata(),
                { deadline: createDeadline() },
                (err: grpc.ServiceError | null, resp?: QueryWriteStatusResponse) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(resp!);
                    }
                });
        });
    }
}
