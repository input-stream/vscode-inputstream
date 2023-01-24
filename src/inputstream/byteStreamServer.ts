import * as grpc from '@grpc/grpc-js';

import { ByteStreamClient, ByteStreamDefinition } from '../proto/google/bytestream/ByteStream';
import { loadByteStreamProtos } from './configuration';
import { ProtoGrpcType as ByteStreamProtoType } from '../proto/bytestream';
import { QueryWriteStatusRequest } from '../proto/google/bytestream/QueryWriteStatusRequest';
import { QueryWriteStatusResponse } from '../proto/google/bytestream/QueryWriteStatusResponse';
import { ReadRequest } from '../proto/google/bytestream/ReadRequest';
import { ReadResponse } from '../proto/google/bytestream/ReadResponse';
import { WriteRequest } from '../proto/google/bytestream/WriteRequest';
import { WriteResponse } from '../proto/google/bytestream/WriteResponse';
import { MethodDefinition } from '@grpc/proto-loader';

export type Chunk = Buffer | Uint8Array | string;

export class InMemoryBytestreamService {
    public readData: Map<string, Chunk[]> = new Map();
    public writeData: Map<string, Chunk[]> = new Map();

    queryWriteStatus(call: grpc.ServerUnaryCall<QueryWriteStatusRequest, QueryWriteStatusResponse>, callback: grpc.sendUnaryData<QueryWriteStatusResponse>): void {
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

    read(call: grpc.ServerWritableStream<ReadRequest, ReadResponse>): void {
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

    write(call: grpc.ServerReadableStream<WriteRequest, WriteResponse>, callback: grpc.sendUnaryData<WriteResponse>): void {
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

    get implementation(): grpc.UntypedServiceImplementation {
        return {
            Read: this.read.bind(this),
            Write: this.write.bind(this),
            QueryWriteStatus: this.queryWriteStatus.bind(this),
        };
    }

    addTo(proto: ByteStreamProtoType, server: grpc.Server): void {
        server.addService(proto.google.bytestream.ByteStream.service, this.implementation);
    }
}

export class BytestreamClientServer {
    proto: ByteStreamProtoType;
    server: grpc.Server;
    service: InMemoryBytestreamService;
    private _client: ByteStreamClient | undefined;

    constructor(private host = '0.0.0.0', private port = '0') {
        this.proto = loadByteStreamProtos('./proto/bytestream.proto');
        this.service = new InMemoryBytestreamService();
        this.server = new grpc.Server();
        this.service.addTo(this.proto, this.server);
    }

    get client(): ByteStreamClient {
        return this._client!;
    }

    async connect(): Promise<ByteStreamClient> {
        return new Promise<ByteStreamClient>((resolve, reject) => {
            this.server.bindAsync(`${this.host}:${this.port}`, grpc.ServerCredentials.createInsecure(), (err: Error | null, port: number) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.server.start();

                this._client = new this.proto.google.bytestream.ByteStream(
                    `${this.host}:${port}`,
                    grpc.credentials.createInsecure());
                const deadline = new Date();
                deadline.setSeconds(deadline.getSeconds() + 2);
                this._client.waitForReady(deadline, (err: Error | undefined) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(this._client!);
                });
            });
        });
    }
}
