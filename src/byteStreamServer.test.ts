import * as grpc from '@grpc/grpc-js';

import Long = require('long');

import { BytestreamClientServer, InMemoryBytestreamService } from "./byteStreamServer";
import { describe, it } from "@jest/globals";
import { expect } from "chai";
import { ReadResponse } from '../proto/google/bytestream/ReadResponse';
import { WriteResponse } from '../proto/google/bytestream/WriteResponse';

describe('InMemoryBytestreamService', () => {
    it('constructor', () => {
        const service = new InMemoryBytestreamService();
        expect(service).to.exist;
        expect(service.readData).to.exist;
        expect(service.writeData).to.exist;
    });
    describe('server', () => {
        let bytestream: BytestreamClientServer;

        beforeEach(async () => {
            bytestream = new BytestreamClientServer();
            return bytestream.connect();
        });

        afterEach(() => {
            bytestream.server.forceShutdown();
        });

        it('ready', () => {
            expect(bytestream.server).to.exist;
            expect(bytestream.client).to.exist;
        });

        it('write', async () => {
            const md = new grpc.Metadata();
            const committedSize = await new Promise<number>((resolve, reject) => {
                const call = bytestream.client.write(md, {}, (err?: grpc.ServiceError | null, out?: WriteResponse | undefined) => {
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
            expect(bytestream.service.writeData.get('greeting')).to.have.length(1);
            expect(bytestream.service.writeData.get('greeting')![0].toString()).to.equal('hello, world!');
        });

        it('read', async () => {
            bytestream.service.readData.set(
                'greeting',
                [Buffer.from('hello, world!', 'utf-8')]
            );
            const md = new grpc.Metadata();
            const read = await new Promise<string>((resolve, reject) => {
                const call = bytestream.client.read({ resourceName: 'greeting' });

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
            });
            expect(read).to.equal('hello, world!');
        });

    });
});
