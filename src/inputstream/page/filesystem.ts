import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as grpc from '@grpc/grpc-js';
import Long = require('long');
import path = require('path');

import { BytesClient } from '../byteStreamClient';
import {
    Input,
    _build_stack_inputstream_v1beta1_Input_Type as InputType,
    _build_stack_inputstream_v1beta1_Input_Status as InputStatus,
} from '../../proto/build/stack/inputstream/v1beta1/Input';
import { InputStreamClient, UnaryCallOptions } from '../inputStreamClient';
import { parseQuery } from '../urihandler';
import { Scheme } from '../constants';
import { TextDecoder, TextEncoder } from 'util';
import { WriteRequest } from '../../proto/google/bytestream/WriteRequest';
import { WriteResponse } from '../../proto/google/bytestream/WriteResponse';
import { User } from '../../proto/build/stack/auth/v1beta1/User';
import { InputFilterOptions } from '../../proto/build/stack/inputstream/v1beta1/InputFilterOptions';
import { FieldMask } from '../../proto/google/protobuf/FieldMask';

const MAX_CLIENT_BODY_SIZE = 10 * 1024 * 1024; // upload size limit

/**
 * Document content provider for input pages.  
 * Modeled after https://github.com/microsoft/vscode-extension-samples/blob/9b8701dceac5fab83345356743170bca609c87f9/fsprovider-sample/src/fileSystemProvider.ts
 */
export class PageFileSystemProvider implements vscode.Disposable, vscode.FileSystemProvider {
    protected disposables: vscode.Disposable[] = [];
    protected inputstreamClient: InputStreamClient | undefined;
    protected bytestreamClient: BytesClient | undefined;
    protected root: RootDir = new RootDir(this);
    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    constructor(
        user: User,
        onDidInputStreamClientChange: vscode.Event<InputStreamClient>,
        onDidByteStreamClientChange: vscode.Event<BytesClient>,
        private onDidInputChange: vscode.EventEmitter<Input>,
    ) {
        onDidInputStreamClientChange(this.handleInputStreamClientChange, this, this.disposables);
        onDidByteStreamClientChange(this.handleBytestreamClientChange, this, this.disposables);
        vscode.workspace.onDidCloseTextDocument(this.handleTextDocumentClose, this, this.disposables);
        this.disposables.push(vscode.workspace.registerFileSystemProvider(Scheme.Page, this, { isCaseSensitive: true }));
        this.root.addUser(user);
        this.root.addStaticDir(makeVscodeSettingsDir());
    }

    get client(): Promise<InputStreamClient> {
        if (!this.inputstreamClient) {
            Promise.reject(vscode.FileSystemError.Unavailable('inputstream client not yet available'));
        }
        return Promise.resolve(this.inputstreamClient!);
    }

    private handleInputStreamClientChange(client: InputStreamClient) {
        this.inputstreamClient = client;
    }

    private handleBytestreamClientChange(client: BytesClient) {
        this.bytestreamClient = client;
    }

    private handleTextDocumentClose(doc: vscode.TextDocument) {
    }

    public filesystem(): vscode.FileSystem {
        return new Filesystem(this);
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
                    const fileContentType = query['fileContentType'];
                    if (!fileContentType) {
                        reject('target URI must have query param fileContentType');
                        return;
                    }
                    const resourceName = query['resourceName'];
                    if (!resourceName) {
                        reject('target URI must have query param resourceName');
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
                        if (token.isCancellationRequested) {
                            reject('Cancellation Requested');
                            return;
                        }
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

                    const chunkSize = 65536;
                    const increment = (chunkSize / size) * 100;

                    // read file in chunks and upload it
                    const stream = fs.createReadStream(source.fsPath, {
                        autoClose: true,
                        highWaterMark: chunkSize,
                    });

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

                        call?.write(req);

                        progress.report({ increment });
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

    private async _lookup(uri: vscode.Uri, silent: false): Promise<Entry>;
    private async _lookup(uri: vscode.Uri, silent: boolean): Promise<Entry | undefined>;
    private async _lookup(uri: vscode.Uri, silent: boolean): Promise<Entry | undefined> {
        const parts = uri.path.split('/');
        let entry: Entry = this.root;
        for (const part of parts) {
            if (!part) {
                continue;
            }
            let child: Entry | undefined;
            if (entry instanceof Dir) {
                child = await entry.getChild(part);
            }
            if (!child) {
                if (!silent) {
                    throw vscode.FileSystemError.FileNotFound(uri);
                } else {
                    return undefined;
                }
            }
            entry = child;
        }
        return entry;
    }

    private async _lookupAsDirectory(uri: vscode.Uri, silent: boolean): Promise<Dir<Entry>> {
        const entry = await this._lookup(uri, silent);
        if (entry instanceof Dir) {
            return entry;
        }
        throw vscode.FileSystemError.FileNotADirectory(uri);
    }

    private async _lookupAsFile(uri: vscode.Uri, silent: boolean): Promise<File> {
        const entry = await this._lookup(uri, silent);
        if (entry instanceof File) {
            return entry;
        }
        throw vscode.FileSystemError.FileIsADirectory(uri);
    }

    private _lookupParentDirectory(uri: vscode.Uri): Promise<Dir<Entry>> {
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        return this._lookupAsDirectory(dirname, false);
    }

    /**
     * stat implements part of the vscode.FileSystemProvider interface.
     * @param uri 
     * @returns 
     */
    public async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        console.log(`stat:`, uri);
        try {
            const info = await this._lookup(uri, false);
            return info;
        } catch (e) {
            throw e;
        }
    }

    /**
     * readDirectory implements part of the vscode.FileSystemProvider interface.
     * @param uri 
     */
    public async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        console.log(`readDirectory:`, uri);
        const entry = await this._lookupAsDirectory(uri, false);
        const result: [string, vscode.FileType][] = [];
        for (const child of await entry.getChildren()) {
            result.push([child.name, child.type]);
        }
        return result;

    }

    /**
     * writeFile implements part of the vscode.FileSystemProvider interface.
     * @param uri 
     * @param content 
     * @param options 
     * @returns 
     */
    public async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {
        console.log(`writeFile:`, uri);

        const basename = path.posix.basename(uri.path);
        const parent = await this._lookupParentDirectory(uri);

        let entry = await parent.getChild(basename);
        if (entry instanceof Dir) {
            throw vscode.FileSystemError.FileIsADirectory(uri);
        }
        if (!entry && !options.create) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        if (entry && options.create && !options.overwrite) {
            throw vscode.FileSystemError.FileExists(uri);
        }
        if (!entry) {
            await parent.createChild(basename, content);
            this._fireSoon({ type: vscode.FileChangeType.Created, uri });
        } else {
            const file = entry as File;
            await file.setData(content);
            this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
        }
    }

    /**
     * readFile implements part of the vscode.FileSystemProvider interface.
     * @param uri 
     * @returns 
     */
    async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        console.log(`readFile:`, uri);
        const file = await this._lookupAsFile(uri, false);
        const data = await file.getData();
        return data;
        // throw vscode.FileSystemError.FileNotFound();
    }

    /**
     * createDirectory implements part of the vscode.FileSystemProvider interface.
     * @param uri 
     */
    public async createDirectory(uri: vscode.Uri): Promise<void> {
        console.log(`createDirectory:`, uri);

        const basename = path.posix.basename(uri.path);
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        const parent = await this._lookupAsDirectory(dirname, false);

        await parent.createChild(basename);
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { type: vscode.FileChangeType.Created, uri });

    }

    /**
     * rename implements part of the vscode.FileSystemProvider interface.
     * @param oldUri 
     * @param newUri 
     * @param options 
     */
    public async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): Promise<void> {
        console.log(`rename:`, oldUri, newUri);

        if (!options.overwrite && await this._lookup(newUri, true)) {
            throw vscode.FileSystemError.FileExists(newUri);
        }

        const entry = await this._lookup(oldUri, false);
        const oldParent = await this._lookupParentDirectory(oldUri);
        const newParent = await this._lookupParentDirectory(newUri);
        const newName = path.posix.basename(newUri.path);

        if (true) {
            throw vscode.FileSystemError.NoPermissions('unsupported operation: rename');
        }
        // if (oldParent === newParent) {
        //     await oldParent.rename(entry.name, newName);
        // } else {
        //     oldParent.createChild(entry.name);
        //     oldParent.deleteChild(entry.name);

        // }
        // entry.name = newName;
        // newParent.entries.set(newName, entry);

        // this._fireSoon(
        //     { type: vscode.FileChangeType.Deleted, uri: oldUri },
        //     { type: vscode.FileChangeType.Created, uri: newUri }
        // );
    }

    /**
     * delete implements part of the vscode.FileSystemProvider interface.
     * @param uri 
     */
    public async delete(uri: vscode.Uri): Promise<void> {
        console.log(`delete:`, uri);

        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        const parent = await this._lookupAsDirectory(dirname, false);
        const basename = path.posix.basename(uri.path);

        await parent.deleteChild(basename);

        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { uri, type: vscode.FileChangeType.Deleted });
    }

    /**
     * watch implements part of the vscode.FileSystemProvider interface.
     * @param _resource 
     * @returns 
     */
    public watch(_resource: vscode.Uri): vscode.Disposable {
        console.log(`watch:`, _resource);
        // ignore, fires for all changes...
        return new vscode.Disposable(() => { });
    }

    /**
     * copy implements part of the vscode.FileSystemProvider interface.
     * @param source 
     * @param target 
     * @param options 
     * @returns 
     */
    public copy(source: vscode.Uri, target: vscode.Uri, options: { overwrite: boolean }): Thenable<void> {
        console.log(`copy:`, source, target);
        if (target.authority === 'img.input.stream') {
            return this.upload(source, target, options);
        }
        throw vscode.FileSystemError.NoPermissions(`unsupported operation: copy to ${target.scheme}://${target.authority}`);
    }

    /**
     * dispose implements part of the vscode.Disposable interface.
     */
    public dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
    }

    private _fireSoon(...events: vscode.FileChangeEvent[]): void {
        this._bufferedEvents.push(...events);

        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }

        this._fireSoonHandle = setTimeout(() => {
            this._emitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0;
        }, 5);
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
    public async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        return this.provider.stat(uri);
    }

    /**
     * Retrieve all entries of a [directory](#FileType.Directory).
     *
     * @param uri The uri of the folder.
     * @return An array of name/type-tuples or a thenable that resolves to such.
     */
    public async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
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
    public async createDirectory(uri: vscode.Uri): Promise<void> {
        return this.provider.createDirectory(uri);
    }

    /**
     * Read the entire contents of a file.
     *
     * @param uri The uri of the file.
     * @return An array of bytes or a thenable that resolves to such.
     */
    public async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        return this.provider.readFile(uri);
    }

    /**
     * Write data to a file, replacing its entire contents.
     *
     * @param uri The uri of the file.
     * @param content The new content of the file.
     */
    public async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
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
    public async delete(uri: vscode.Uri, options?: { recursive?: boolean, useTrash?: boolean }): Promise<void> {
        return this.provider.delete(uri, { recursive: options?.recursive || false });
    }

    /**
     * Rename a file or folder.
     *
     * @param oldUri The existing file.
     * @param newUri The new location.
     * @param options Defines if existing files should be overwritten.
     */
    public async rename(source: vscode.Uri, target: vscode.Uri, options?: { overwrite?: boolean }): Promise<void> {
        return this.provider.rename(source, target, {
            overwrite: options?.overwrite || false,
        });
    }

    /**
     * Copy files or folders.
     *
     * @param source The existing file.
     * @param destination The destination location.
     * @param options Defines if existing files should be overwritten.
     */
    public async copy(source: vscode.Uri, target: vscode.Uri, options?: { overwrite?: boolean }): Promise<void> {
        if (!this.provider.copy) {
            throw vscode.FileSystemError.NoPermissions('unsupported operation: copy');
        }
        return this.provider.copy(source, target, {
            overwrite: options?.overwrite || false,
        });
    }

    public isWritableFileSystem(scheme: string): boolean | undefined {
        return scheme === Scheme.Page;
    }
}

interface Entry extends vscode.FileStat {
    name: string;
}

interface DirectoryEntry<T extends Entry> extends Entry {
    getChild(name: string): Promise<T | undefined>;
    getChildren(): Promise<T[]>;
    createChild(name: string, content: Uint8Array): Promise<T>;
    deleteChild(name: string): Promise<void>;
}

interface FileEntry extends Entry {
    getData(): Promise<Uint8Array>;
    setData(data: Uint8Array): Promise<void>;
}

abstract class File implements FileEntry {
    public type = vscode.FileType.File;
    public size: number = 0;

    constructor(
        public name: string,
        public ctime: number = 0,
        public mtime: number = 0
    ) { }

    abstract getData(): Promise<Uint8Array>;
    abstract setData(data: Uint8Array): Promise<void>;
}

abstract class Dir<T extends Entry> implements DirectoryEntry<T> {
    private entries: Map<string, T>;

    public type = vscode.FileType.Directory;
    public get size(): number { return this.entries.size; }

    constructor(
        public name: string,
        public ctime: number = 0,
        public mtime: number = 0
    ) {
        this.entries = new Map();
    }

    protected addChild(child: T): T {
        this.entries.set(child.name, child);
        return child;
    }

    protected removeChild(child: T): void {
        this.entries.delete(child.name);
    }

    async getChild(name: string): Promise<T | undefined> {
        return this.entries.get(name);
    }

    async getChildren(): Promise<T[]> {
        return Array.from(this.entries.values());
    }

    abstract createChild(name: string, data?: Uint8Array): Promise<T>;
    abstract deleteChild(name: string): Promise<void>;
}

class StaticFile extends File {
    constructor(name: string, private data: Uint8Array) {
        super(name);
    }

    public async getData(): Promise<Uint8Array> {
        return this.data;
    }

    public async setData(data: Uint8Array): Promise<void> {
        throw vscode.FileSystemError.NoPermissions(`unsupported operation: write`);
    }

    static fromText(name: string, text: string): StaticFile {
        return new StaticFile(name, new TextEncoder().encode(text));
    }
}

class StaticDir extends Dir<StaticFile> {
    constructor(name: string, files: StaticFile[]) {
        super(name);

        for (const file of files) {
            this.addChild(file);
        }
    }

    async createChild(name: string, data?: Uint8Array | undefined): Promise<StaticFile> {
        throw vscode.FileSystemError.NoPermissions(`unsupported operation: create`);
    }

    async deleteChild(name: string): Promise<void> {
        throw vscode.FileSystemError.NoPermissions(`unsupported operation: delete`);
    }
}

interface ClientContext {
    client: Promise<InputStreamClient>
}

class RootDir extends Dir<Entry> {
    constructor(
        protected ctx: ClientContext,
    ) {
        super('Stream!');
    }

    addUser(user: User): void {
        this.addChild(new UserDir(this.ctx, user));
    }

    addStaticDir(folder: StaticDir): void {
        this.addChild(folder);
    }

    async createChild(name: string, data?: Uint8Array): Promise<UserDir> {
        throw vscode.FileSystemError.NoPermissions('cannot create file at root level');
    }

    async deleteChild(name: string): Promise<void> {
        throw vscode.FileSystemError.NoPermissions('unsupported operation: delete');
    }

}

class UserDir extends Dir<InputDir> {
    private hasLoaded = false;

    constructor(
        protected ctx: ClientContext,
        protected user: User,
    ) {
        super(user.login!);
    }

    async getChildren(): Promise<InputDir[]> {
        if (!this.hasLoaded) {
            const inputs = await this.loadInputs();
            if (inputs) {
                for (const input of inputs) {
                    this.addChild(new InputDir(this.ctx, this.user, input));
                }
            }
            this.hasLoaded = true;
        }
        return super.getChildren();
    }

    async createChild(name: string, data?: Uint8Array): Promise<InputDir> {
        const client = await this.ctx.client;

        let input: Input | undefined = {
            status: 'STATUS_DRAFT',
            title: name,
            owner: this.user.login,
            login: this.user.login,
            type: InputType.TYPE_SHORT_POST,
        };

        try {
            input = await client.createInput(input);
        } catch (e) {
            let message = '(no details available)';
            if (e instanceof Error) {
                message = e.message;
            }
            throw vscode.FileSystemError.Unavailable(`inputstream createInput failed: ${message}`);
        }
        if (!input) {
            throw vscode.FileSystemError.Unavailable(`create input failed to initialize document`);
        }

        return this.addChild(new InputDir(this.ctx, this.user, input));

        // this.onDidInputChange.fire(file.input);
    }

    async deleteChild(name: string): Promise<void> {
        const child = await this.getChild(name);
        if (!child) {
            throw vscode.FileSystemError.FileNotFound(name);
        }
        const client = await this.ctx.client;
        const selection = await vscode.window.showInformationMessage(`Are you sure you want to delete ${name}?`, 'Delete', 'Cancel');
        if (selection !== 'Delete') {
            return;
        }
        await client.removeInput(name);
        this.removeChild(child);
        this.mtime = Date.now();
    }

    async getChild(name: string): Promise<InputDir | undefined> {
        let child = await super.getChild(name);
        if (child) {
            return child;
        }
        const input = await this.fetchInput(this.user.login!, name);
        if (!input) {
            return;
        }
        return this.addChild(new InputDir(this.ctx, this.user, input));
    }

    protected async loadInputs(): Promise<Input[] | undefined> {
        const client = await this.ctx.client;
        return client.listInputs({
            owner: this.user.login!,
        });
    }

    protected async fetchInput(login: string, id: string): Promise<Input | undefined> {
        const client = await this.ctx.client;
        try {
            const filter: InputFilterOptions = { login, id };
            const mask: FieldMask = { paths: ['content'] };
            const options: UnaryCallOptions = { limit: 1, silent: true };
            return client.getInput(filter, mask, options);
        } catch (e) {
            console.log(`could not get input: ${login}/${id}`);
            return undefined;
        }
    }

}

class InputDir extends Dir<File> {
    content: ContentFile;

    constructor(
        protected ctx: ClientContext,
        protected user: User,
        protected input: Input,
    ) {
        super(input.title!);

        this.content = new ContentFile(input.titleSlug! + ".md", ctx, input);
        this.addChild(this.content);
    }

    async deleteChild(name: string): Promise<void> {
        throw vscode.FileSystemError.NoPermissions('unsupported operation: delete');
    }

    async createChild(name: string, data: Uint8Array): Promise<File> {
        throw vscode.FileSystemError.NoPermissions(`Input "${this.input.title}" does not support creating additional files or folders`);
    }

    async getChild(name: string): Promise<File | undefined> {
        return super.getChild(name);
        // TODO: implement get / set asset
    }

    protected async fetchInput(login: string, id: string): Promise<Input | undefined> {
        const client = await this.ctx.client;
        try {
            return client.getInput({ login, id }, { paths: ['content'] });
        } catch (e) {
            console.log(`could not get input: ${login}/${id}`);
            return undefined;
        }
    }

}

class ContentFile extends File {
    private data: Uint8Array | undefined;

    constructor(
        name: string,
        private ctx: ClientContext,
        private input: Input,
    ) {
        super(name);
        if (input.createdAt) {
            this.ctime = Long.fromValue(input.createdAt!.seconds!).toNumber() * 1000;
        }
        if (input.updatedAt) {
            this.mtime = Long.fromValue(input.updatedAt!.seconds!).toNumber() * 1000;
        }
        if (input.content?.shortPost?.markdown) {
            this.data = new TextEncoder().encode(input.content?.shortPost?.markdown);
            this.size = this.data.byteLength;
        }
    }

    async getData(): Promise<Uint8Array> {
        if (!this.data) {
            this.data = await this.loadData();
        }
        return this.data;
    }

    async setData(data: Uint8Array): Promise<void> {
        const client = await this.ctx.client;

        this.input.content = {
            shortPost: {
                markdown: new TextDecoder().decode(data),
            }
        };

        const response = await client.updateInput(this.input, { paths: ['content'] });
        // this.mtime = response.input?.modifiedAt; // NEED THIS
        this.mtime = this.mtime + 1;

        this.data = data;
        this.size = data.byteLength;
    }

    private async loadData(): Promise<Uint8Array> {
        const client = await this.ctx.client;
        const input = await client.getInput({ login: this.input.login, id: this.input.id }, { paths: ['content'] });
        this.input.content = input?.content;
        return new TextEncoder().encode(input?.content?.shortPost?.markdown);
    }
}

function makeVscodeSettingsDir(): StaticDir {
    return new StaticDir('.vscode', [
        StaticFile.fromText('settings.json', `{
            "markdown.experimental.editor.pasteLinks.enabled": true,
            "editor.experimental.pasteActions.enabled": true       
        }`),
        StaticFile.fromText('multiroot.code-workspace', `{
            "folders": [
                {
                    "path": "."
                },
                {
                    "name": "Stream",
                    "uri": "page:/"
                }
            ]
        }`),
    ]);
}