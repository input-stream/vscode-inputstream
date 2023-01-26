import * as grpc from '@grpc/grpc-js';

import { InMemoryBytestreamService } from './byteStreamServer';
import { loadByteStreamProtos } from './clients';
import { ProtoGrpcType as ByteStreamProtoType } from './proto/bytestream';
import { ByteStreamClient } from './proto/google/bytestream/ByteStream';

/**
 * BytestreamClientServer is a client/server pair used for testing.
 */
export class BytestreamClientServer {
    private _client: ByteStreamClient | undefined;

    proto: ByteStreamProtoType;
    server: grpc.Server;
    service: InMemoryBytestreamService;

    constructor(private host = '0.0.0.0', private port = '0') {
        this.proto = loadByteStreamProtos('./proto/bytestream.proto');
        this.service = new InMemoryBytestreamService();
        this.server = new grpc.Server();
        this.service.addTo(this.proto, this.server);
    }

    // ===================== PUBLIC =====================

    public get client(): ByteStreamClient {
        return this._client!;
    }

    public async connect(): Promise<ByteStreamClient> {
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
