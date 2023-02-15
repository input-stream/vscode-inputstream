import * as grpc from '@grpc/grpc-js';

import { ProtoGrpcType as ByteStreamProtoType } from './proto/bytestream';
import { QueryWriteStatusRequest } from './proto/google/bytestream/QueryWriteStatusRequest';
import { QueryWriteStatusResponse } from './proto/google/bytestream/QueryWriteStatusResponse';
import { ReadRequest } from './proto/google/bytestream/ReadRequest';
import { ReadResponse } from './proto/google/bytestream/ReadResponse';
import { WriteRequest } from './proto/google/bytestream/WriteRequest';
import { WriteResponse } from './proto/google/bytestream/WriteResponse';

export type Chunk = Buffer | Uint8Array | string;

export class InMemoryBytestreamService {
    public readData: Map<string, Chunk[]> = new Map();
    public writeData: Map<string, Chunk[]> = new Map();

    // ===================== PUBLIC =====================

    public addTo(proto: ByteStreamProtoType, server: grpc.Server): void {
        server.addService(proto.google.bytestream.ByteStream.service, {
            Read: this.read.bind(this),
            Write: this.write.bind(this),
            QueryWriteStatus: this.queryWriteStatus.bind(this),
        });
    }

    // ===================== PRIVATE =====================

    private queryWriteStatus(call: grpc.ServerUnaryCall<QueryWriteStatusRequest, QueryWriteStatusResponse>, callback: grpc.sendUnaryData<QueryWriteStatusResponse>): void {
        const chunks = this.writeData.get(call.request.resourceName!);
        if (chunks && chunks.length) {
            let committedSize = 0;
            for (const chunk of chunks) {
                const buffer = Buffer.from(chunk);
                committedSize += buffer.byteLength;
            }
            callback(null, { committedSize });
        } else {
            callback(new grpc.StatusBuilder().withCode(grpc.status.NOT_FOUND).build());
        }
    }

    private read(call: grpc.ServerWritableStream<ReadRequest, ReadResponse>): void {
        const chunks = this.readData.get(call.request.resourceName!);
        if (chunks && chunks.length) {
            for (const data of chunks) {
                call.write({ data });
            }
            call.end();
        } else {
            const status = new grpc.StatusBuilder().withCode(grpc.status.NOT_FOUND).build();
            call.emit('status', status);
            call.end();
        }
    }

    private write(call: grpc.ServerReadableStream<WriteRequest, WriteResponse>, callback: grpc.sendUnaryData<WriteResponse>): void {
        let committedSize = 0;

        call.on('data', (req: WriteRequest) => {
            let chunks = this.writeData.get(req.resourceName!);
            if (!chunks) {
                chunks = [];
                this.writeData.set(req.resourceName!, chunks);
            }
            chunks.push(req.data!);
            committedSize += Buffer.from(req.data!).byteLength;
        });

        call.on('end', () => {
            callback(null, { committedSize });
        });
    }

}

