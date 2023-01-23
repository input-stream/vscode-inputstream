import * as grpc from '@grpc/grpc-js';
import { describe, it } from "@jest/globals";
import { expect } from "chai";
import { ByteStreamClient } from '../proto/google/bytestream/ByteStream';
import { Chunk, InMemoryBytestreamService } from "./byteStreamServer";
import { loadByteStreamProtos } from './configuration';
import { ProtoGrpcType as ByteStreamProtoType } from '../proto/bytestream';
import { WriteResponse } from '../proto/google/bytestream/WriteResponse';
import Long = require('long');
import { resolve } from 'path';
import { ReadResponse } from '../proto/google/bytestream/ReadResponse';

describe('InMemoryBytestreamService', () => {
    it('constructor', () => {
        const service = new InMemoryBytestreamService();
        expect(service).to.exist;
        expect(service.readData).to.exist;
        expect(service.writeData).to.exist;
    });
    describe('server', () => {
        const proto: ByteStreamProtoType = loadByteStreamProtos('./proto/bytestream.proto');
        let client: ByteStreamClient;
        let server: grpc.Server;
        let service: InMemoryBytestreamService;

        beforeEach(async () => {
            service = new InMemoryBytestreamService();
            server = new grpc.Server();
            service.addTo(proto, server);

            return new Promise((resolve, reject) => {
                server.bindAsync('0.0.0.0:0', grpc.ServerCredentials.createInsecure(), (err: Error | null, port: number) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    server.start();

                    client = new proto.google.bytestream.ByteStream(
                        `0.0.0.0:${port}`,
                        grpc.credentials.createInsecure());
                    const deadline = new Date();
                    deadline.setSeconds(deadline.getSeconds() + 2);
                    client.waitForReady(deadline, (err: Error | undefined) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve();
                    });
                });
            });
        });

        afterEach(() => {
            server.forceShutdown();
        });

        it('ready', () => {
            expect(server).to.exist;
            expect(client).to.exist;
        });

        it('write', async () => {
            const md = new grpc.Metadata();
            const committedSize = await new Promise<number>((resolve, reject) => {
                const call = client.write(md, {}, (err?: grpc.ServiceError | null, out?: WriteResponse | undefined) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(Long.fromValue(out!.committedSize!).toNumber());
                });
                call.write({
                    resourceName: 'greeting',
                    data: Buffer.from('hello, world!', 'utf-8')
                });
                call.end();
            });
            expect(committedSize).to.equal(13);
            expect(service.writeData.get('greeting')).to.have.length(1);
            expect(service.writeData.get('greeting')![0].toString()).to.equal('hello, world!');
        });

        it('read', async () => {
            service.readData.set(
                'greeting',
                [Buffer.from('hello, world!', 'utf-8')]
            );
            const md = new grpc.Metadata();
            const read = await new Promise<string>((resolve, reject) => {
                const call = client.read({ resourceName: 'greeting' });

                let readSize = 0;
                const chunks: Buffer[] = [];

                call.on('data', (resp: ReadResponse) => {
                    const chunk = Buffer.from(resp.data!);
                    chunks.push(chunk);
                    readSize += chunk.byteLength;
                });

                call.on('status', (status: grpc.StatusObject) => {
                    if (status.code === grpc.status.OK) {
                        resolve(Buffer.concat(chunks).toString());
                    } else {
                        reject(status);
                    }
                });

                call.on('error', (err: Error) => {
                    reject(err);
                });

                call.on('end', () => {
                    resolve(Buffer.concat(chunks).toString());
                });
                // const call = client.write(md, {}, (err?: grpc.ServiceError | null, out?: WriteResponse | undefined) => {
                //     if (err) {
                //         reject(err);
                //         return;
                //     }
                //     resolve(Long.fromValue(out!.committedSize!).toNumber());
                // });
                // call.write({ data: Buffer.from('hello, world!', 'utf-8') });
                // call.end();
            });
            expect(read).to.equal('hello, world!');
        });

    });
});
