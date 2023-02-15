import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import Long from 'long';

import { makeBytestreamDownloadResourceName, makeInputFileNodeUri } from '../filesystems';
import { File } from '../proto/build/stack/inputstream/v1beta1/File';
import { ReadResponse } from '../proto/google/bytestream/ReadResponse';
import { FileNode } from './fileNode';
import { IFileUploader } from './inputNode';
import { NodeContext } from './node';
import { Input } from '../proto/build/stack/inputstream/v1beta1/Input';


export class InputFileNode extends FileNode {
    private data: Uint8Array | Buffer | undefined;

    get size(): number {
        return this.data ? this.data.byteLength : 0;
    }

    constructor(
        private ctx: NodeContext,
        private uploader: IFileUploader,
        input: Input,
        public file: File,
    ) {
        super(makeInputFileNodeUri(input, file));
        this.ctimeTimestamp = file.createdAt;
        this.mtimeTimestamp = file.modifiedAt;

        if (file.data instanceof Buffer || file.data instanceof Uint8Array) {
            this.data = file.data;
        }
    }

    async getData(): Promise<Uint8Array> {
        if (!this.data) {
            this.data = await this.loadData();
        }
        return this.data;
    }

    async setData(data: Uint8Array): Promise<void> {
        this.file.data = data;
        await this.uploader.uploadFile(this.file);
        this.data = data;
        this._mtime = Date.now();
    }

    private async loadData(): Promise<Uint8Array> {
        if (!this.file.sha256) {
            throw vscode.FileSystemError.NoPermissions(`file sha256 is mandatory`);
        }
        if (typeof this.file.size === 'undefined') {
            throw vscode.FileSystemError.NoPermissions(`file size is mandatory`);
        }

        const size = this.file.size;
        const client = this.ctx.byteStreamClient;

        const resourceName = makeBytestreamDownloadResourceName(this.file.sha256, Long.fromValue(this.file.size).toNumber());
        const data = await new Promise<Buffer>((resolve, reject) => {
            const buffer = Buffer.alloc(Long.fromValue(size).toNumber());
            const call = client.read({
                resourceName: resourceName,
                readOffset: 0,
            });
            let offset = 0;

            call.on('metadata', (md: grpc.Metadata) => {
                // console.log(`loadData metadata:`, md);
            });
            call.on('status', (status: grpc.StatusObject) => {
                switch (status.code) {
                    case grpc.status.OK:
                        resolve(buffer);
                        return;
                    case grpc.status.CANCELLED:
                        reject(new Error(`file download cancelled: ${status.details} (code ${status.code})`));
                        return;
                    default:
                        reject(new Error(`file download failed: ${status.details} (code ${status.code})`));
                        return;
                }
            });
            call.on('data', (response: ReadResponse) => {
                if (response.data instanceof Buffer) {
                    response.data.copy(buffer, offset);
                    offset += response.data.byteLength;
                }
            });
            call.on('error', (err) => {
                reject(err);
            });
            call.on('end', () => {
                resolve(buffer);
            });
        });
        return data;
    }
}
