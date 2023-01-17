import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';

import { BytesClient } from '../byteStreamClient';
import { FieldMask } from '../../proto/google/protobuf/FieldMask';
import { Input, _build_stack_inputstream_v1beta1_Input_Status as InputStatus } from '../../proto/build/stack/inputstream/v1beta1/Input';
import { InputStreamClient } from '../inputStreamClient';
import { Scheme } from '../constants';
import { ShortPostInputContent } from '../../proto/build/stack/inputstream/v1beta1/ShortPostInputContent';
import { TextDecoder, TextEncoder } from 'util';
import { WriteResponse } from '../../proto/google/bytestream/WriteResponse';
import Long = require('long');
import { WriteRequest } from '../../proto/google/bytestream/WriteRequest';
import path = require('path');
import { parseQuery } from '../urihandler';

const MAX_CLIENT_BODY_SIZE = 10 * 1024 * 1024; // upload size limit

/**
 * Document content provider for input pages.  
 * Modeled after https://github.com/microsoft/vscode-extension-samples/blob/9b8701dceac5fab83345356743170bca609c87f9/fsprovider-sample/src/fileSystemProvider.ts
 */
export class PageFileSystemProvider implements vscode.Disposable, vscode.FileSystemProvider {
    protected disposables: vscode.Disposable[] = [];
    protected inputstreamClient: InputStreamClient | undefined;
    protected bytestreamClient: BytesClient | undefined;
    protected files: Map<string, InputFile> = new Map();
    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    constructor(
        onDidInputStreamClientChange: vscode.Event<InputStreamClient>,
        onDidByteStreamClientChange: vscode.Event<BytesClient>,
        private onDidInputChange: vscode.EventEmitter<Input>,
    ) {
        onDidInputStreamClientChange(this.handleInputStreamClientChange, this, this.disposables);
        onDidByteStreamClientChange(this.handleBytestreamClientChange, this, this.disposables);
        vscode.workspace.onDidCloseTextDocument(this.handleTextDocumentClose, this, this.disposables);
        this.disposables.push(vscode.workspace.registerFileSystemProvider(Scheme.Page, this, { isCaseSensitive: true }));
    }

    public filesystem(): vscode.FileSystem {
        return new Filesystem(this);
    }

    private handleInputStreamClientChange(client: InputStreamClient) {
        this.inputstreamClient = client;
    }

    private handleBytestreamClientChange(client: BytesClient) {
        this.bytestreamClient = client;
    }

    private handleTextDocumentClose(doc: vscode.TextDocument) {
    }

    public async getFile(uri: vscode.Uri): Promise<InputFile> {
        let file = this.files.get(uri.path);
        if (!file) {
            file = await this.openFile(uri);
            this.files.set(uri.path, file);
        }
        return file;
    }

    protected async openFile(uri: vscode.Uri): Promise<InputFile> {
        if (!this.inputstreamClient) {
            throw vscode.FileSystemError.Unavailable(uri);
        }

        const parts = uri.path.split('/');
        const login = parts[1];
        const id = parts[2];
        // const slug = parts[2];
        if (!(login && id)) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        const mask: FieldMask = {
            paths: ['content'],
        };

        try {
            const input = await this.inputstreamClient.getInput({ login, id }, mask);
            return new InputFile(input!);
        } catch (err) {
            if (err instanceof Error) {
                vscode.window.showErrorMessage(`Could not get input content: ${err.message}`);
                throw err;
            }
        }

        // TODO(pcj): remove this, we are only fooling the compiler
        return new InputFile({} as Input);
    }

    protected async createFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
        return this.updateFile(uri, content);
    }

    protected async updateFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
        if (!this.inputstreamClient) {
            throw vscode.FileSystemError.Unavailable(uri);
        }
        const file = await this.getFile(uri);
        const text = new TextDecoder().decode(content);
        const short: ShortPostInputContent = {
            markdown: text,
        };
        file.input.content = {
            value: 'shortPost',
            shortPost: short,
        };
        const mask: FieldMask = {
            paths: ['content'],
        };

        const response = await this.inputstreamClient.updateInput(file.input, mask);
        this.onDidInputChange.fire(file.input);
    }

    public async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        return this.getFile(uri);
    }

    public async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        throw vscode.FileSystemError.FileNotFound(uri);
    }

    public async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {
        const file = this.getFile(uri);
        if (options.create) {
            return this.createFile(uri, content);
        }
        return this.updateFile(uri, content);
    }

    async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        const file = await this.getFile(uri);
        return file.data!;
    }

    public async createDirectory(uri: vscode.Uri): Promise<void> {
        throw vscode.FileSystemError.Unavailable('unsupported operation: create directory');
    }

    public rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
        throw vscode.FileSystemError.Unavailable('unsupported operation: rename');
    }

    public delete(uri: vscode.Uri): void {
        throw vscode.FileSystemError.Unavailable('unsupported operation: delete');
    }

    public watch(_resource: vscode.Uri): vscode.Disposable {
        // ignore, fires for all changes...
        return new vscode.Disposable(() => { });
    }

    public copy(source: vscode.Uri, target: vscode.Uri, options: { overwrite: boolean }): Thenable<void> {
        if (target.authority === 'img.input.stream') {
            return this.upload(source, target, options);
        }
        throw vscode.FileSystemError.Unavailable(`unsupported operation: copy to ${target.scheme}://${target.authority}`);
    }

    private upload(source: vscode.Uri, target: vscode.Uri, options: { overwrite: boolean }): Thenable<void> {
        return vscode.window.withProgress<void>(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Uploading ${path.basename(target.path)}...`,
                cancellable: true,
            },
            (progress: vscode.Progress<{
                message?: string | undefined,
                increment?: number | undefined,
            }>, token: vscode.CancellationToken): Promise<void> => {
                return new Promise<void>((resolve, reject) => {
                    const query = parseQuery(target);
                    const fileContentType = query["fileContentType"];
                    if (!fileContentType) {
                        reject("target URI must have query param contentType");
                        return;
                    }
                    const resourceName = query["resourceName"];
                    if (!resourceName) {
                        reject("target URI must have query param resourceName");
                        return;
                    }
                    const size = parseInt(path.basename(resourceName));
                    // send the filename and content-type as metadata since the
                    // resource name is really just the content hash.
                    const md = new grpc.Metadata();
                    md.set('filename', target.path);
                    md.set('file-content-type', fileContentType);

                    if (size > MAX_CLIENT_BODY_SIZE) {
                        reject(new Error(`cannot upload ${target.path} (${size}b > ${MAX_CLIENT_BODY_SIZE}`));
                        return;
                    }

                    // prepare the call.
                    const call = this.bytestreamClient?.write((err: grpc.ServiceError | null | undefined, resp: WriteResponse | undefined) => {
                        console.log(`write response: committed size: ${resp?.committedSize}`);
                    }, md);

                    call?.on('status', (status: grpc.StatusObject) => {
                        switch (status.code) {
                            case grpc.status.OK:
                                resolve();
                                break;
                            case grpc.status.CANCELLED:
                                reject(new Error(`file upload cancelled: ${status.details} (code ${status.code})`));
                                break;
                            default:
                                reject(new Error(`file upload failed: ${status.details} (code ${status.code})`));
                                break;
                        }
                    });

                    call?.on('error', (err: Error) => {
                        reject(err);
                    });

                    call?.on('end', () => {
                        resolve();
                    });

                    // read file in chunks and upload it
                    const stream = fs.createReadStream(source.fsPath, {
                        autoClose: true,
                    });

                    let offset = 0;
                    stream.on('data', (chunk: Buffer) => {
                        const nextOffset = offset + chunk.length;
                        const req: WriteRequest = {
                            resourceName: resourceName,
                            writeOffset: offset,
                            data: chunk,
                            finishWrite: nextOffset === size,
                        };
                        offset = nextOffset;
                        call?.write(req);
                        progress.report({
                            increment: (offset / size) * 100,
                        });
                    });

                    stream.on('error', (err: any) => {
                        reject(err);
                    });

                    stream.on('end', () => {
                        call?.end();
                    });
                });
            },
        );

    }

    public dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
    }

}

class Filesystem implements vscode.FileSystem {
    constructor(private provider: vscode.FileSystemProvider) { }


    /**
     * Retrieve metadata about a file.
     *
     * @param uri The uri of the file to retrieve metadata about.
     * @return The file metadata about the file.
     */
    async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        return this.provider.stat(uri);
    }

    /**
     * Retrieve all entries of a [directory](#FileType.Directory).
     *
     * @param uri The uri of the folder.
     * @return An array of name/type-tuples or a thenable that resolves to such.
     */
    async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        return this.provider.readDirectory(uri);
    }

    /**
     * Create a new directory (Note, that new files are created via `write`-calls).
     *
     * *Note* that missing directories are created automatically, e.g this call has
     * `mkdirp` semantics.
     *
     * @param uri The uri of the new folder.
     */
    async createDirectory(uri: vscode.Uri): Promise<void> {
        return this.provider.createDirectory(uri);
    }

    /**
     * Read the entire contents of a file.
     *
     * @param uri The uri of the file.
     * @return An array of bytes or a thenable that resolves to such.
     */
    async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        return this.provider.readFile(uri);
    }

    /**
     * Write data to a file, replacing its entire contents.
     *
     * @param uri The uri of the file.
     * @param content The new content of the file.
     */
    async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
        return this.provider.writeFile(uri, content, {
            create: true,
            overwrite: true,
        });
    }

    /**
     * Delete a file.
     *
     * @param uri The resource that is to be deleted.
     * @param options Defines if trash can should be used and if deletion of folders is recursive
     */
    async delete(uri: vscode.Uri, options?: { recursive?: boolean, useTrash?: boolean }): Promise<void> {
        return this.provider.delete(uri, { recursive: options?.recursive || false });
    }

    /**
     * Rename a file or folder.
     *
     * @param oldUri The existing file.
     * @param newUri The new location.
     * @param options Defines if existing files should be overwritten.
     */
    async rename(source: vscode.Uri, target: vscode.Uri, options?: { overwrite?: boolean }): Promise<void> {
        return this.provider.rename(source, target, {
            overwrite: options?.overwrite || false,
        })
    }

    /**
     * Copy files or folders.
     *
     * @param source The existing file.
     * @param destination The destination location.
     * @param options Defines if existing files should be overwritten.
     */
    async copy(source: vscode.Uri, target: vscode.Uri, options?: { overwrite?: boolean }): Promise<void> {
        if (!this.provider.copy) {
            throw vscode.FileSystemError.Unavailable('unsupported operation: copy');
        }
        return this.provider.copy(source, target, {
            overwrite: options?.overwrite || false,
        })
    }

}

export class InputFile implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;
    name: string;
    data?: Uint8Array;

    constructor(
        public input: Input,
    ) {
        const source = getPageContentSource(input);
        this.data = new TextEncoder().encode(source);
        this.type = vscode.FileType.File;
        this.ctime = Long.fromValue(input.createdAt!.seconds!).toNumber() * 1000;
        this.mtime = Long.fromValue(input.updatedAt!.seconds!).toNumber() * 1000;
        this.size = source.length;
        this.name = input.id!;
    }
}

function getPageContentSource(input: Input): string {
    if (!input.content) {
        return '';
    }
    if (input.content.shortPost) {
        return input.content.shortPost.markdown || '';
    }
    return '';
}
