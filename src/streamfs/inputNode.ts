import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import imageSize from 'image-size';
import { Readable } from 'node:stream';

import { childUri } from '../uris';
import { ContentFileNode } from './contentFileNode';
import { DirNode } from './directoryNode';
import { File } from '../proto/build/stack/inputstream/v1beta1/File';
import { FileNode } from './fileNode';
import { FileSet } from '../proto/build/stack/inputstream/v1beta1/FileSet';
import { getContentTypeForExtension, makeBytestreamUploadResourceName, makeInputContentName, makeInputNodeUri, MAX_CLIENT_BODY_SIZE, sha256Bytes } from '../filesystems';
import { Input, _build_stack_inputstream_v1beta1_Input_Status as InputStatus } from '../proto/build/stack/inputstream/v1beta1/Input';
import { InputFileNode } from './inputFileNode';
import { NodeContext } from './node';
import { User } from '../proto/build/stack/auth/v1beta1/User';
import { Utils } from 'vscode-uri';
import { WriteRequest } from '../proto/google/bytestream/WriteRequest';
import { WriteResponse } from '../proto/google/bytestream/WriteResponse';


export interface IFileUploader {
    uploadFile(file: File): Promise<File>
}

export class InputNode extends DirNode<FileNode> {
    // wantFileProgress can be set to false to avoid vscode runtime dependency
    // code during testing. 
    wantFileProgress = true;

    constructor(
        protected ctx: NodeContext,
        protected user: User,
        public input: Input,
    ) {
        super(makeInputNodeUri(input));

        this.addContentFileNode(input);
        if (input.fileSet) {
            this.addFileSet(input.fileSet);
        }
    }

    addFileSet(fileSet: FileSet): void {
        if (fileSet.files) {
            for (const inputFile of fileSet.files) {
                this.addInputFileNode(inputFile);
            }
        }
    }

    addInputFileNode(file: File): InputFileNode {
        return this.addChild(new InputFileNode(this.ctx, this, this.input, file));
    }

    addContentFileNode(input: Input): ContentFileNode {
        return this.addChild(new ContentFileNode(this.ctx, input));
    }

    async rename(src: string, dst: string): Promise<FileNode> {
        const b = await this.getChild(dst);
        if (b) {
            throw vscode.FileSystemError.FileExists(dst);
        }
        const a = await this.getChild(src);
        if (!(a instanceof InputFileNode)) {
            throw vscode.FileSystemError.NoPermissions(`Rename is not supported for this file`);
        }
        this.removeChild(a);
        a.file.name = dst;
        const node = this.addInputFileNode(a.file);
        await this.updateFileSet();
        return node;
    }

    async deleteChild(name: string): Promise<void> {
        const child = await this.getChild(name);
        if (!child) {
            throw vscode.FileSystemError.FileNotFound(name);
        }
        if (!(child instanceof InputFileNode)) {
            throw vscode.FileSystemError.NoPermissions(`This type of file cannot be deleted`);
        }

        this.removeChild(child);

        await this.updateFileSet();
    }

    async createFile(name: string, data: Uint8Array): Promise<FileNode> {
        const uri = childUri(this.uri, name);
        const ext = Utils.extname(uri);
        const contentType = getContentTypeForExtension(ext);
        if (!contentType) {
            throw vscode.FileSystemError.NoPermissions(`Input "${this.input.title}" does not support adding "${ext}" files`);
        }
        const nodes = await this.uploadFiles([{ name, contentType, data: Buffer.from(data) }]);
        return nodes[0];
    }

    async uploadFiles(uploads: File[]): Promise<InputFileNode[]> {
        const work = uploads.map(f => this.uploadFile(f));
        const uploaded = await Promise.all(work);
        const newNodes = uploaded.map(f => this.addInputFileNode(f));

        await this.updateFileSet();

        return newNodes;
    }

    async uploadFile(file: File): Promise<File> {
        if (!file.name) {
            throw vscode.FileSystemError.NoPermissions(`file must have a name`);
        }
        if (!(file.data instanceof Buffer)) {
            throw vscode.FileSystemError.NoPermissions(`file to upload must have associated Buffer: ` + file.name);
        }
        file.size = file.data.byteLength;
        if (!file.createdAt) {
            file.createdAt = { seconds: Date.now() * 1000 };
        }
        file.modifiedAt = { seconds: Date.now() * 1000 };
        file.sha256 = await this.uploadBlob(file, file.data);
        return file;
    }

    async createDirectory(name: string): Promise<FileNode> {
        throw vscode.FileSystemError.NoPermissions(`Input "${this.input.title}" does not support creating child folders`);
    }

    async getChild(name: string): Promise<FileNode | undefined> {
        return super.getChild(name);
        // TODO: implement get / set asset
    }

    protected async fetchInput(login: string, id: string): Promise<Input | undefined> {
        const client = this.ctx.inputsClient;
        try {
            return client.getInput({ login, id }, { paths: ['content'] });
        } catch (e) {
            console.log(`could not get input: ${login}/${id}`);
            return undefined;
        }
    }

    public async updateStatus(status: InputStatus): Promise<Input | undefined> {
        const client = this.ctx.inputsClient;
        const prevStatus = this.input.status;
        const oldChild = await this.getChild(makeInputContentName(this.input));
        try {
            this.input.status = status;
            const response = await client.updateInput(this.input, {
                paths: ['status'],
            });
            if (oldChild) {
                this.removeChild(oldChild);
            }
            this.addContentFileNode(this.input);
            return this.input;
        } catch (e) {
            this.input.status = prevStatus;
            console.log(`could not update input status: ${this.input.login}/${this.input.title}`);
            return undefined;
        }
    }

    public async updateFileSet(): Promise<Input | undefined> {
        const files: File[] = [];
        for (const child of await this.getChildren()) {
            if (child instanceof InputFileNode) {
                // clear out any data before we save!  (data field is only a convenience function)
                child.file.data = undefined;
                files.push(child.file);
            }
        }

        const client = this.ctx.inputsClient;
        const prevFileSet = this.input.fileSet;
        files.sort((a, b) => a.name!.localeCompare(b.name!));

        try {
            this.input.fileSet = { files };
            const response = await client.updateInput(this.input, {
                paths: ['file_set'],
            });
            return this.input;
        } catch (e) {
            this.input.fileSet = prevFileSet;
            console.log(`could not update fileSet: ${this.input.login}/${this.input.title}`);
            return undefined;
        }
    }

    public async updateTitle(title: string): Promise<Input | undefined> {
        const client = this.ctx.inputsClient;
        const prevTitle = this.input.title;
        try {
            this.input.title = title;
            const response = await client.updateInput(this.input, {
                paths: ['title'],
            });
            return this.input;
        } catch (e) {
            this.input.title = prevTitle;
            console.log(`could not update input title: ${this.input.login}/${this.input.title}`);
            return undefined;
        }
    }

    public async uploadBlob(file: File, buffer: Buffer): Promise<string> {
        const size = buffer.byteLength;
        if (size > MAX_CLIENT_BODY_SIZE) {
            throw vscode.FileSystemError.NoPermissions(`cannot upload ${file.name} (${size}b > ${MAX_CLIENT_BODY_SIZE}`);
        }

        const sha256 = sha256Bytes(buffer);
        const resourceName = makeBytestreamUploadResourceName(this.input.id!, sha256, size);

        if (this.wantFileProgress) {
            await vscode.window.withProgress<void>({
                location: vscode.ProgressLocation.Notification,
                title: `Uploading ${file.name}...`,
                cancellable: true,
            }, (progress: vscode.Progress<{
                message?: string | undefined,
                increment?: number | undefined,
            }>, token: vscode.CancellationToken): Promise<void> => {
                return this.writeBlob(progress, token, file, resourceName, buffer);
            });
        } else {
            // const tokenSource = new vscode.CancellationTokenSource();
            const emitter = new vscode.EventEmitter();
            await this.writeBlob(
                {
                    report: (update: { message: string | undefined, increment: number | undefined }) => { return; },
                },
                {
                    isCancellationRequested: false,
                    onCancellationRequested: emitter.event,
                },
                file,
                resourceName,
                buffer,
            );
        }

        return sha256;
    }

    private async writeBlob(
        progress: vscode.Progress<{ message?: string | undefined, increment?: number | undefined }>,
        token: vscode.CancellationToken,
        file: File,
        resourceName: string,
        buffer: Buffer,
    ): Promise<void> {

        const client = this.ctx.byteStreamClient;
        const size = buffer.byteLength;
        const chunkSize = 65536;
        const increment = (chunkSize / size) * 100;

        const stream = Readable.from(buffer, {
            highWaterMark: chunkSize,
        });

        const call = client.write((err: grpc.ServiceError | null | undefined, resp: WriteResponse | undefined) => {
            if (err) {
                console.log(`write response error:`, err);
            } else {
                console.log(`write response: committed size: ${resp?.committedSize}`);
            }
        });
        if (!call) {
            throw vscode.FileSystemError.Unavailable(`bytestream call was unexpectedly undefined`);
        }

        return new Promise((resolve, reject) => {
            call.on('status', (status: grpc.StatusObject) => {
                if (token.isCancellationRequested) {
                    reject('Cancellation Requested');
                    return;
                }
                switch (status.code) {
                    case grpc.status.OK:
                        resolve();
                        return;
                    case grpc.status.CANCELLED:
                        reject(new Error(`file upload cancelled: ${status.details} (code ${status.code})`));
                        return;
                    default:
                        reject(new Error(`file upload failed: ${status.details} (code ${status.code})`));
                        return;
                }
            });
            call.on('error', reject);
            call.on('end', resolve);

            let wantImageSize = true;
            let offset = 0;
            stream.on('data', (chunk: Buffer) => {
                if (token.isCancellationRequested) {
                    reject('Cancellation Requested');
                    return;
                }
                const nextOffset = offset + chunk.length;
                const req: WriteRequest = {
                    resourceName: resourceName,
                    writeOffset: offset,
                    data: chunk,
                    finishWrite: nextOffset === size,
                };
                offset = nextOffset;

                call.write(req);

                if (wantImageSize && didCaptureImageInfo(file, chunk)) {
                    wantImageSize = false;
                }

                progress.report({ increment });
            });
            stream.on('error', reject);
            stream.on('end', () => call.end());
        });

    }

    async decorate(token: vscode.CancellationToken): Promise<vscode.FileDecoration | null | undefined> {
        switch (this.input.status) {
            case InputStatus.STATUS_DRAFT:
                return new vscode.FileDecoration('D', 'Draft', new vscode.ThemeColor('testing.iconQueued'));
            default:
                return undefined;
        }
    }

}


function didCaptureImageInfo(file: File, chunk: Buffer): boolean {
    try {
        const result = imageSize(chunk);
        if (result.type) {
            file.contentType = `image/${result.type}`;
        }
        file.imageInfo = {
            height: result.height,
            width: result.width,
            orientation: result.orientation,
        };
        return true;
    } catch (e) {
        return false;
    }
}

function makeInputName(input: Input): string {
    return input.title!;
}
