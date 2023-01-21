import * as vscode from 'vscode';
import * as crypto from 'crypto';
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
import { FileSet } from '../../proto/build/stack/inputstream/v1beta1/FileSet';
import { File as FilesetFile } from '../../proto/build/stack/inputstream/v1beta1/File';
import { InputStreamClient, UnaryCallOptions } from '../inputStreamClient';
import { parseQuery } from '../urihandler';
import { CommandName, Scheme } from '../constants';
import { TextDecoder, TextEncoder } from 'util';
import { WriteRequest } from '../../proto/google/bytestream/WriteRequest';
import { WriteResponse } from '../../proto/google/bytestream/WriteResponse';
import { User } from '../../proto/build/stack/auth/v1beta1/User';
import { InputFilterOptions } from '../../proto/build/stack/inputstream/v1beta1/InputFilterOptions';
import { FieldMask } from '../../proto/google/protobuf/FieldMask';
import { BuiltInCommands } from '../../constants';
import { ReadResponse } from '../../proto/google/bytestream/ReadResponse';
import { Readable } from 'stream';
import { InputStep, MultiStepInput } from '../../multiStepInput';

type selectPredicate = (child: Entry) => boolean;

const MAX_CLIENT_BODY_SIZE = 10 * 1024 * 1024; // upload size limit
const activeCodeWorkspaceName = 'active.code-workspace';
const defaultSelectPredicate = (child: Entry) => { return false; };
const inputNodePredicate = (child: Entry) => child instanceof InputNode;
const userNodePredicate = (child: Entry) => child instanceof UserNode;

class ClientContext {
    listFilterStatus: InputStatus | undefined;

    constructor(
        public inputStreamClient: () => Promise<InputStreamClient>,
        public byteStreamClient: () => Promise<BytesClient>,
    ) {
    }

    clone(): ClientContext {
        const ctx = new ClientContext(
            this.inputStreamClient,
            this.byteStreamClient,
        );
        ctx.listFilterStatus = this.listFilterStatus;
        return ctx;
    }

    withListFilterStatus(status: InputStatus): ClientContext {
        const ctx = this.clone();
        ctx.listFilterStatus = status;
        return ctx;
    }
}

/**
 * Document content provider for input pages.  
 * Modeled after https://github.com/microsoft/vscode-extension-samples/blob/9b8701dceac5fab83345356743170bca609c87f9/fsprovider-sample/src/fileSystemProvider.ts
 */
export class PageFileSystemProvider implements vscode.Disposable, vscode.FileSystemProvider {
    protected disposables: vscode.Disposable[] = [];
    protected inputstreamClient: InputStreamClient | undefined;
    protected bytestreamClient: BytesClient | undefined;
    protected root: RootNode = new RootNode(this.createClientContext());
    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    constructor(
        private user: User,
        onDidInputStreamClientChange: vscode.Event<InputStreamClient>,
        onDidByteStreamClientChange: vscode.Event<BytesClient>,
    ) {
        onDidInputStreamClientChange(this.handleInputStreamClientChange, this, this.disposables);
        onDidByteStreamClientChange(this.handleBytestreamClientChange, this, this.disposables);

        vscode.workspace.onDidCloseTextDocument(this.handleTextDocumentClose, this, this.disposables);

        this.disposables.push(
            vscode.workspace.registerFileSystemProvider(Scheme.Stream, this, { isCaseSensitive: true, isReadonly: false }));

        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputCreate, this.handleCommandInputCreate, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputReplace, this.handleCommandInputReplace, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputWatch, this.handleCommandInputWatch, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputPublish, this.handleCommandInputPublish, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputUnpublish, this.handleCommandInputUnPublish, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputDelete, this.handleCommandInputDelete, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.ImageUpload, this.handleCommandImageUpload, this));

        this.root.addStaticDir(makeUserProfileDir(user));
        this.root.addStaticDir(new VscodeDirNode(this._fireSoon.bind(this)));
        this.root.addUser(user);
    }

    createClientContext(): ClientContext {
        return new ClientContext(
            this.getInputStreamClient.bind(this),
            this.getByteStreamClient.bind(this),
        );
    }

    private getInputStreamClient(): Promise<InputStreamClient> {
        if (!this.inputstreamClient) {
            Promise.reject(vscode.FileSystemError.Unavailable('inputstream client not yet available'));
        }
        return Promise.resolve(this.inputstreamClient!);
    }

    private getByteStreamClient(): Promise<BytesClient> {
        if (!this.bytestreamClient) {
            Promise.reject(vscode.FileSystemError.Unavailable('Bytestream client not yet available'));
        }
        return Promise.resolve(this.bytestreamClient!);
    }

    public async handleCommandImageUpload() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const docUri = editor.document.uri;
        if (!docUri) {
            return;
        }
        const node = await this._lookup<InputNode>(docUri, true, inputNodePredicate);
        if (!node) {
            return;
        }

        const options: vscode.OpenDialogOptions = {
            canSelectMany: true,
            openLabel: 'Upload',
            filters: {
                'Images': imageExtensionNames,
            }
        };
        const fileUris = await vscode.window.showOpenDialog(options);
        if (!fileUris || fileUris.length === 0) {
            return;
        }

        const files = fileUris.map((uri: vscode.Uri) => {
            const name = path.posix.basename(uri.fsPath);
            const contentType = makeImageContentType(name);
            const data = Buffer.from(fs.readFileSync(uri.fsPath));
            return { name, contentType, data };
        });

        const uploaded = await node.uploadFiles(files);

        const uploadedUris = uploaded.map(node => {
            return docUri.with({ path: path.posix.join(docUri.path, node.name) });
        });

        const links = uploaded.map(node => {
            const href = vscode.Uri.file(`./${path.posix.basename(node.file.name!)}`).toString();
            return `![${node.file.contentType}](./${href})`;
        });
        const content = links.join("\n");

        editor.edit((edit) => {
            const selection = editor.selection;
            if (selection.isEmpty) {
                edit.insert(selection.start, content);
            } else {
                edit.replace(selection, content);
            }
        });

        const events: vscode.FileChangeEvent[] = uploadedUris.map(uri => {
            return { uri, type: vscode.FileChangeType.Created };
        });
        events.push({ uri: docUri, type: vscode.FileChangeType.Changed });

        this._fireSoon(...events);
    }


    private async handleCommandInputCreate() {
        const request: Input = {
            status: InputStatus.STATUS_DRAFT,
            owner: this.user.login,
            login: this.user.login,
            type: InputType.TYPE_SHORT_POST,
        };

        const setTitle: InputStep = async (msi) => {
            const title = await msi.showInputBox({
                title: 'Title',
                totalSteps: 1,
                step: 1,
                value: '',
                prompt: 'Choose a title (you can always change it later)',
                validate: async (value: string) => { return ''; },
                shouldResume: async () => false,
            });
            if (title) {
                request.title = title;
            }
            return undefined;
        };
        // Uncomment when we have more than one type of input.
        //
        // const pickType: InputStep = async (input) => {
        //     const picked = await input.showQuickPick({
        //         title: 'Input Type',
        //         totalSteps: 2,
        //         step: 1,
        //         items: [{
        //             label: 'Page',
        //             type: InputType.TYPE_SHORT_POST,
        //         }],
        //         placeholder: 'Choose input type',
        //         shouldResume: async () => false,
        //     });
        //     request.type = (picked as InputTypeQuickPickItem).type;
        //     return setTitle;
        // };
        await MultiStepInput.run(setTitle);
        if (!request.title) {
            return;
        }

        try {
            const userUri = makeUserNodeUri(this.user);
            const userNode = await this._lookup<UserNode>(userUri, false, userNodePredicate);
            if (!userNode) {
                return;
            }
            const client = await this.getInputStreamClient();
            const input = await client.createInput(request);
            if (input) {
                const inputUri = makeUserNodeUri(this.user);
                userNode.addInputNode(input);
                this._fireSoon(
                    { type: vscode.FileChangeType.Changed, uri: userUri },
                    { type: vscode.FileChangeType.Created, uri: inputUri }
                );
                vscode.commands.executeCommand(BuiltInCommands.Open, makeInputContentFileNodeUri(input));
            }
        } catch (err) {
            if (err instanceof Error) {
                vscode.window.showErrorMessage(`Could not create: ${err.message}`);
            }
        }
    }

    private async handleCommandInputWatch(uri: vscode.Uri): Promise<boolean> {
        const node = await this._lookup<InputNode>(uri, true, inputNodePredicate);
        if (!node) {
            return false;
        }
        return vscode.env.openExternal(makeInputExternalWatchUrl(node.input));
    }

    private async handleCommandInputPublish(uri: vscode.Uri): Promise<Input | undefined> {
        const selection = await vscode.window.showInformationMessage(`This page will be publically accessible.  Update page status?`, 'Proceed', 'Cancel');
        if (selection !== 'Proceed') {
            return;
        }
        const input = await this.updateInputStatus(uri, InputStatus.STATUS_PUBLISHED);
        if (input) {
            vscode.env.openExternal(makeInputExternalViewUrl(input));
        }
        return input;
    }

    private async handleCommandInputUnPublish(uri: vscode.Uri): Promise<Input | undefined> {
        const selection = await vscode.window.showInformationMessage(`This page will no longer be available to the public.  Update page status?`, 'Proceed', 'Cancel');
        if (selection !== 'Proceed') {
            return;
        }

        const input = await this.updateInputStatus(uri, InputStatus.STATUS_DRAFT);
        if (input) {
            vscode.env.openExternal(makeInputExternalWatchUrl(input));
        }
        return input;
    }

    private async handleCommandInputReplace(oldUri: vscode.Uri, newUri: vscode.Uri, next: Input): Promise<void> {
        const node = await this._lookup<UserNode>(oldUri, true, userNodePredicate);
        if (!node) {
            return;
        }
        const selection = vscode.window.activeTextEditor?.selection;
        vscode.commands.executeCommand(BuiltInCommands.CloseActiveEditor);

        await node.replaceInputById(next);

        this._fireSoon(
            { type: vscode.FileChangeType.Deleted, uri: oldUri },
            { type: vscode.FileChangeType.Created, uri: newUri }
        );

        setTimeout(async () => {
            await vscode.commands.executeCommand(BuiltInCommands.Open, makeInputContentFileNodeUri(next));
            if (selection && vscode.window.activeTextEditor) {
                vscode.window.activeTextEditor.selection = selection;
            }
        }, 20);
    }

    async handleCommandInputDelete(uri: vscode.Uri) {
        const node = await this._lookup<InputNode>(uri, true, inputNodePredicate);
        if (!node) {
            return;
        }
        return this.delete(makeInputNodeUri(node.input));
    }

    private async updateInputStatus(uri: vscode.Uri, status: InputStatus): Promise<Input | undefined> {
        const node = await this._lookup<InputNode>(uri, true, inputNodePredicate);
        if (!node) {
            return;
        }
        const input = await node.updateStatus(status);
        vscode.commands.executeCommand(BuiltInCommands.CloseActiveEditor);
        this._fireSoon(
            { type: vscode.FileChangeType.Deleted, uri },
            { type: vscode.FileChangeType.Created, uri }
        );
        if (input) {
            setTimeout(() => {
                vscode.commands.executeCommand(BuiltInCommands.Open, makeInputContentFileNodeUri(input));
            }, 20);
        }
        return input;
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

    private async _lookup<T extends Entry>(uri: vscode.Uri, silent: false, select?: selectPredicate): Promise<T>;
    private async _lookup<T extends Entry>(uri: vscode.Uri, silent: boolean, select?: selectPredicate): Promise<T | undefined>;
    private async _lookup<T extends Entry>(uri: vscode.Uri, silent: boolean, select: selectPredicate = defaultSelectPredicate): Promise<T | undefined> {
        const parts = uri.path.split('/');
        let entry: Entry = this.root;
        for (const part of parts) {
            if (!part) {
                continue;
            }
            let child: Entry | undefined;
            if (entry instanceof DirNode) {
                child = await entry.getChild(part);
            }
            if (!child) {
                if (!silent) {
                    throw vscode.FileSystemError.FileNotFound(uri);
                } else {
                    return undefined;
                }
            }
            if (select(child)) {
                return child as T;
            }
            entry = child;
        }
        return entry as T;
    }

    private async _lookupAsDirectory(uri: vscode.Uri, silent: boolean): Promise<DirNode<Entry>> {
        const entry = await this._lookup(uri, silent);
        if (entry instanceof DirNode) {
            return entry;
        }
        throw vscode.FileSystemError.FileNotADirectory(uri);
    }

    private async _lookupAsFile(uri: vscode.Uri, silent: boolean): Promise<FileNode> {
        const entry = await this._lookup(uri, silent);
        if (entry instanceof FileNode) {
            return entry;
        }
        throw vscode.FileSystemError.FileIsADirectory(uri);
    }

    private _lookupParentDirectory(uri: vscode.Uri): Promise<DirNode<Entry>> {
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        return this._lookupAsDirectory(dirname, false);
    }

    /**
     * stat implements part of the vscode.FileSystemProvider interface.
     * @param uri 
     * @returns 
     */
    public async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        try {
            const info = await this._lookup(uri, false);
            console.log(`stat ok:`, uri);
            return info;
        } catch (e) {
            console.log(`stat error:`, uri, (e as Error).message);
            throw e;
        }
    }

    /**
     * readDirectory implements part of the vscode.FileSystemProvider interface.
     * @param uri 
     */
    public async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        const entry = await this._lookupAsDirectory(uri, false);
        const result: [string, vscode.FileType][] = [];
        for (const child of await entry.getChildren()) {
            result.push([child.name, child.type]);
        }
        console.log(`readDirectory:`, uri.toString(), `(${result.length} entries)`);
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

        const entry = await parent.getChild(basename);
        if (entry instanceof DirNode) {
            throw vscode.FileSystemError.FileIsADirectory(uri);
        }
        if (!entry && !options.create) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        if (entry && options.create && !options.overwrite) {
            throw vscode.FileSystemError.FileExists(uri);
        }
        if (!entry) {
            await parent.createFile(basename, content);
            this._fireSoon({ type: vscode.FileChangeType.Created, uri });
        } else {
            const file = entry as FileNode;
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
        return file.getData();
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

        await parent.createDirectory(basename);
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

        if (oldParent && oldParent === newParent) {
            await oldParent.rename(entry.name, newName);
            this._fireSoon(
                { type: vscode.FileChangeType.Deleted, uri: oldUri },
                { type: vscode.FileChangeType.Created, uri: newUri }
            );
        } else {
            throw vscode.FileSystemError.NoPermissions('unsupported operation: rename');
        }
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
        return scheme === Scheme.Stream;
    }
}

interface Entry extends vscode.FileStat {
    name: string;
}

interface DirectoryEntry<T extends Entry> extends Entry {
    getChild(name: string): Promise<T | undefined>;
    getChildren(): Promise<T[]>;
    createFile(name: string, content: Uint8Array): Promise<T>;
    createDirectory(name: string): Promise<T>;
    rename(src: string, dst: string): Promise<T>;
    deleteChild(name: string): Promise<void>;
}

interface FileEntry extends Entry {
    getData(): Promise<Uint8Array>;
    setData(data: Uint8Array): Promise<void>;
}

abstract class FileNode implements FileEntry {
    public type = vscode.FileType.File;
    public size = 0;

    constructor(
        public name: string,
        public ctime: number = 0,
        public mtime: number = 0
    ) { }

    abstract getData(): Promise<Uint8Array>;
    abstract setData(data: Uint8Array): Promise<void>;
}

abstract class DirNode<T extends Entry> implements DirectoryEntry<T> {
    private children: Map<string, T>;

    public type = vscode.FileType.Directory;
    public get size(): number { return this.children.size; }

    constructor(
        public name: string,
        public ctime: number = 0,
        public mtime: number = 0
    ) {
        this.children = new Map();
    }

    public addChild<C extends T>(child: C): C {
        this.children.set(child.name, child);
        return child;
    }

    public removeChild(child: T): void {
        this.children.delete(child.name);
    }

    async getChild(name: string): Promise<T | undefined> {
        return this.children.get(name);
    }

    async getChildren(): Promise<T[]> {
        return Array.from(this.children.values());
    }

    abstract rename(src: string, dst: string): Promise<T>;
    abstract createFile(name: string, data?: Uint8Array): Promise<T>;
    abstract createDirectory(name: string): Promise<T>;
    abstract deleteChild(name: string): Promise<void>;
}

class StaticFileNode extends FileNode {
    constructor(name: string, private data: Uint8Array) {
        super(name);
    }

    public async getData(): Promise<Uint8Array> {
        return this.data;
    }

    public async setData(data: Uint8Array): Promise<void> {
        throw vscode.FileSystemError.NoPermissions(`unsupported operation: write`);
    }

    static fromText(name: string, text: string): StaticFileNode {
        return new StaticFileNode(name, new TextEncoder().encode(text));
    }

    static fromJson(name: string, data: any): StaticFileNode {
        return StaticFileNode.fromText(name, JSON.stringify(data, null, 4));
    }

}

class StaticDirNode extends DirNode<Entry> {
    constructor(name: string, files: Entry[]) {
        super(name);

        for (const file of files) {
            this.addChild(file);
        }
    }

    rename(src: string, dst: string): Promise<StaticFileNode> {
        throw vscode.FileSystemError.NoPermissions(`unsupported operation: rename`);
    }

    createFile(name: string, data?: Uint8Array | undefined): Promise<StaticFileNode> {
        throw vscode.FileSystemError.NoPermissions(`unsupported operation: create file`);
    }

    createDirectory(name: string): Promise<StaticFileNode> {
        throw vscode.FileSystemError.NoPermissions(`unsupported operation: create directory`);
    }

    deleteChild(name: string): Promise<void> {
        throw vscode.FileSystemError.NoPermissions(`unsupported operation: delete`);
    }
}

class VscodeDirNode extends StaticDirNode {
    constructor(
        private fireSoon: (...events: vscode.FileChangeEvent[]) => void
    ) {
        super('.vscode', []);
        vscode.workspace.onDidChangeWorkspaceFolders(this.handleWorkspaceFoldersChangeEvent, this);

        this.addChild(StaticFileNode.fromJson("settings.json", {
            "markdown.experimental.editor.pasteLinks.enabled": true,
            "editor.experimental.pasteActions.enabled": true
        }));
        this.recreateActiveCodeWorkspace();
    }

    async handleWorkspaceFoldersChangeEvent(e: vscode.WorkspaceFoldersChangeEvent) {
        await this.recreateActiveCodeWorkspace();
    }

    async recreateActiveCodeWorkspace() {
        const child = await this.getChild(activeCodeWorkspaceName);
        if (child) {
            this.removeChild(child);
        }
        const wsUri = vscode.Uri.parse(`${Scheme.Stream}:/${this.name}/${activeCodeWorkspaceName}`);
        this.addChild(StaticFileNode.fromJson(activeCodeWorkspaceName, this.makeActiveCodeWorkspace()));
        this.fireSoon(
            {
                uri: wsUri,
                type: vscode.FileChangeType.Deleted,
            },
            {
                uri: wsUri,
                type: vscode.FileChangeType.Created,
            },
            {
                uri: vscode.Uri.parse(`${Scheme.Stream}:/${this.name}`),
                type: vscode.FileChangeType.Changed
            }
        );
        if (vscode.window.activeTextEditor?.document.uri.toString() === wsUri.toString()) {
            vscode.commands.executeCommand(BuiltInCommands.CloseActiveEditor);
            vscode.commands.executeCommand(BuiltInCommands.Open, wsUri);
        }
    }

    makeActiveCodeWorkspace(): { folders: { name: string, uri: string, path?: string }[] } {
        const folders = [];
        for (const folder of vscode.workspace.workspaceFolders || []) {
            folders.push({ name: folder.name, uri: folder.uri.toString() });
        }
        return { folders };
    }
}

class RootNode extends DirNode<Entry> {
    constructor(
        private ctx: ClientContext
    ) {
        super('root');
    }

    addUser(user: User): UserNode {
        return this.addChild(new UserNode(this.ctx, user));
    }

    addStaticDir(folder: StaticDirNode): void {
        this.addChild(folder);
    }

    rename(src: string, dst: string): Promise<StaticFileNode> {
        throw vscode.FileSystemError.NoPermissions(`unsupported operation: rename`);
    }

    createFile(name: string, data?: Uint8Array): Promise<UserNode> {
        throw vscode.FileSystemError.NoPermissions('cannot create file at root level');
    }

    createDirectory(name: string): Promise<UserNode> {
        throw vscode.FileSystemError.NoPermissions('cannot create directory at root level');
    }

    deleteChild(name: string): Promise<void> {
        throw vscode.FileSystemError.NoPermissions('unsupported operation: delete');
    }
}

class UserNode extends DirNode<InputNode> {
    private hasLoaded = false;

    constructor(
        protected ctx: ClientContext,
        protected user: User,
    ) {
        super(makeUserName(user));
    }

    async getChildren(): Promise<InputNode[]> {
        if (!this.hasLoaded) {
            const inputs = await this.loadInputs();
            if (inputs) {
                for (const input of inputs) {
                    this.addInputNode(input);
                }
            }
            this.hasLoaded = true;
        }
        return super.getChildren();
    }

    public async replaceInputById(next: Input): Promise<InputNode | undefined> {
        for (const curr of await this.getChildren()) {
            if (curr.input.id === next.id) {
                this.removeChild(curr);
                return this.addInputNode(next);
            }
        }
    }

    public addInputNode(input: Input): InputNode {
        return this.addChild(new InputNode(this.ctx, this.user, input));
    }

    async rename(src: string, dst: string): Promise<InputNode> {
        const oldChild = await this.getChild(src);
        if (!(oldChild instanceof InputNode)) {
            throw vscode.FileSystemError.FileNotFound(src);
        }
        const input = await oldChild.updateTitle(dst);
        if (!input) {
            throw vscode.FileSystemError.Unavailable(`rename title operation failed`);
        }
        this.removeChild(oldChild);
        return this.addInputNode(input);
    }

    createFile(name: string, data?: Uint8Array): Promise<InputNode> {
        throw vscode.FileSystemError.NoPermissions('create file not supported; use create directory to initialize a new Input');
    }

    async createDirectory(name: string): Promise<InputNode> {
        const client = await this.ctx.inputStreamClient();

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

        setTimeout(() => {
            vscode.commands.executeCommand(BuiltInCommands.Open, makeInputContentFileNodeUri(input!));
        }, 1);

        return this.addInputNode(input);
    }

    async deleteChild(name: string): Promise<void> {
        const child = await this.getChild(name);
        if (!child) {
            throw vscode.FileSystemError.FileNotFound(name);
        }
        const client = await this.ctx.inputStreamClient();
        const selection = await vscode.window.showInformationMessage(`Are you sure you want to delete ${name}?`, 'Delete', 'Cancel');
        if (selection !== 'Delete') {
            return;
        }
        await client.removeInput(child.input.id!);
        this.removeChild(child);
        this.mtime = Date.now();
    }

    async getChild(name: string): Promise<InputNode | undefined> {
        const child = await super.getChild(name);
        if (child) {
            return child;
        }
        const input = await this.fetchInputByTitle(this.user.login!, name);
        if (!input) {
            return;
        }
        return this.addInputNode(input);
    }

    protected async loadInputs(): Promise<Input[] | undefined> {
        const client = await this.ctx.inputStreamClient();
        return client.listInputs({
            login: this.user.login,
            status: this.ctx.listFilterStatus,
        });
    }

    protected async fetchInputByTitle(login: string, title: string): Promise<Input | undefined> {
        const client = await this.ctx.inputStreamClient();
        try {
            const filter: InputFilterOptions = { login, title };
            const mask: FieldMask = { paths: ['content'] };
            const options: UnaryCallOptions = { limit: 1, silent: true };
            const input = await client.getInput(filter, mask, options);
            return input;
        } catch (e) {
            console.log(`could not fetch input: ${login}/${title}`, e);
            return undefined;
        }
    }

}

class InputNode extends DirNode<FileNode> {
    private content: ContentFileNode;

    constructor(
        protected ctx: ClientContext,
        protected user: User,
        public input: Input,
    ) {
        super(makeInputName(input));
        this.content = this.addContentFileNode(input);
        if (input.fileSet) {
            this.addFileSet(input.fileSet);
        }
    }

    addFileSet(fileSet: FileSet): void {
        if (fileSet.files) {
            for (const inputFile of fileSet.files) {
                this.addFilesetFileNode(inputFile);
            }
        }
    }

    addFilesetFileNode(file: FilesetFile): FilesetFileNode {
        return this.addChild(new FilesetFileNode(makeInputFileName(this.input, file), this.ctx, this, this.input, file));
    }

    addContentFileNode(input: Input): ContentFileNode {
        return this.addChild(new ContentFileNode(makeInputContentName(input), this.ctx, input));
    }

    async rename(src: string, dst: string): Promise<FileNode> {
        const b = await this.getChild(dst)
        if (b) {
            throw vscode.FileSystemError.FileExists(dst);
        }
        const a = await this.getChild(src)
        if (!(a instanceof FilesetFileNode)) {
            throw vscode.FileSystemError.NoPermissions(`Rename is not supported for this file`)
        }
        this.removeChild(a);
        a.file.name = dst;
        const node = this.addFilesetFileNode(a.file);
        await this.updateFileSet();
        return node;
    }

    async deleteChild(name: string): Promise<void> {
        const child = await this.getChild(name);
        if (!child) {
            throw vscode.FileSystemError.FileNotFound(name);
        }
        if (!(child instanceof FilesetFileNode)) {
            throw vscode.FileSystemError.NoPermissions(`This type of file cannot be deleted`);
        }

        this.removeChild(child);

        await this.updateFileSet();
    }

    async createFile(name: string, data: Uint8Array): Promise<FileNode> {
        const ext = path.posix.extname(name);
        const contentType = makeContentType(ext);
        if (!contentType) {
            throw vscode.FileSystemError.NoPermissions(`Input "${this.input.title}" does not support adding "${ext}" files`);
        }
        const nodes = await this.uploadFiles([{ name, contentType, data: Buffer.from(data) }]);
        return nodes[0];
    }

    async uploadFiles(uploads: FilesetFile[]): Promise<FilesetFileNode[]> {
        const work = uploads.map(f => this.uploadFile(f));
        const uploaded = await Promise.all(work);
        const newNodes = uploaded.map(f => this.addFilesetFileNode(f));

        await this.updateFileSet();

        return newNodes;
    }

    async uploadFile(file: FilesetFile): Promise<FilesetFile> {
        const buffer = file.data;
        if (!(buffer instanceof Buffer)) {
            throw vscode.FileSystemError.NoPermissions(`file to upload must have associated Buffer: ` + file.name);
        }
        file.name = makeInputAssetName(this.input, file.name!);
        file.size = buffer.byteLength;
        if (!file.createdAt) {
            file.createdAt = { seconds: Date.now() * 1000 };
        }
        file.modifiedAt = { seconds: Date.now() * 1000 };
        file.sha256 = await this.uploadBlob(file.name, buffer);
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
        const client = await this.ctx.inputStreamClient();
        try {
            return client.getInput({ login, id }, { paths: ['content'] });
        } catch (e) {
            console.log(`could not get input: ${login}/${id}`);
            return undefined;
        }
    }

    public async updateStatus(status: InputStatus): Promise<Input | undefined> {
        const client = await this.ctx.inputStreamClient();
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
            this.content = this.addContentFileNode(this.input);
            return this.input;
        } catch (e) {
            this.input.status = prevStatus;
            console.log(`could not update input status: ${this.input.login}/${this.input.title}`);
            return undefined;
        }
    }

    public async updateFileSet(): Promise<Input | undefined> {
        const files: FilesetFile[] = [];
        for (const child of await this.getChildren()) {
            if (child instanceof FilesetFileNode) {
                files.push(child.file);
            }
        }

        const client = await this.ctx.inputStreamClient();
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
        const client = await this.ctx.inputStreamClient();
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

    public async uploadBlob(name: string, buffer: Buffer): Promise<string> {
        const size = buffer.byteLength;
        if (size > MAX_CLIENT_BODY_SIZE) {
            throw vscode.FileSystemError.NoPermissions(`cannot upload ${name} (${size}b > ${MAX_CLIENT_BODY_SIZE}`);
        }

        const sha256 = sha256Bytes(buffer);
        const resourceName = makeBytestreamUploadResourceName(this.input.id!, sha256, size);

        await this.writeBlob(name, resourceName, name, buffer);

        return sha256;
    }

    private async writeBlob(
        name: string,
        resourceName: string,
        contentType: string,
        buffer: Buffer): Promise<void> {

        return vscode.window.withProgress<void>({
            location: vscode.ProgressLocation.Notification,
            title: `Uploading ${path.basename(name)}...`,
            cancellable: true,
        }, (progress: vscode.Progress<{
            message?: string | undefined,
            increment?: number | undefined,
        }>, token: vscode.CancellationToken): Promise<void> => {
            return this.writeBlobWithProgress(progress, token, name, resourceName, contentType, buffer);
        });

    }

    private async writeBlobWithProgress(
        progress: vscode.Progress<{ message?: string | undefined, increment?: number | undefined }>,
        token: vscode.CancellationToken,
        name: string,
        resourceName: string,
        contentType: string,
        buffer: Buffer): Promise<void> {

        const client = await this.ctx.byteStreamClient();
        const size = buffer.byteLength;
        const chunkSize = 65536;
        const increment = (chunkSize / size) * 100;

        const stream = Readable.from(buffer, {
            highWaterMark: chunkSize,
        });

        const md = new grpc.Metadata();
        md.set('filename', name);
        md.set('file-content-type', contentType);

        const call = client.write((err: grpc.ServiceError | null | undefined, resp: WriteResponse | undefined) => {
            console.log(`write response: committed size: ${resp?.committedSize}`);
        }, md);
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

                progress.report({ increment });
            });
            stream.on('error', reject);
            stream.on('end', () => call.end());
        });

    }
}

class ContentFileNode extends FileNode {
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
        if (this.input.status === InputStatus.STATUS_PUBLISHED) {
            const selection = await vscode.window.showInformationMessage(`You can't edit a published page.  Would you like to convert it to a draft?`, 'Yes', 'Cancel');
            if (selection === 'Yes') {
                vscode.commands.executeCommand(CommandName.InputUnpublish, makeInputNodeUri(this.input));
                return;
            }
            throw vscode.FileSystemError.NoPermissions(`ReadOnly File`);
        }

        const client = await this.ctx.inputStreamClient();

        this.input.content = {
            shortPost: {
                markdown: new TextDecoder().decode(data),
            }
        };

        const response = await client.updateInput(this.input, { paths: ['content'] });

        if (response.input && response.input.title && response.input.title !== this.input.title) {
            const current = this.input;
            const next = response.input;
            setTimeout(() => {
                vscode.commands.executeCommand(CommandName.InputReplace, makeInputNodeUri(current), makeInputNodeUri(next), next);
            }, 50);
        }

        // this.mtime = response.input?.modifiedAt; // NEED THIS
        this.mtime = this.mtime + 1;

        this.data = data;
        this.size = data.byteLength;
    }

    private async loadData(): Promise<Uint8Array> {
        const client = await this.ctx.inputStreamClient();
        const input = await client.getInput({ login: this.input.login, id: this.input.id }, { paths: ['content'] });
        this.input.content = input?.content;
        return new TextEncoder().encode(input?.content?.shortPost?.markdown);
    }
}

class FilesetFileNode extends FileNode {
    private data: Uint8Array | Buffer | undefined;

    constructor(
        name: string,
        private ctx: ClientContext,
        private parent: InputNode,
        private input: Input,
        public file: FilesetFile,
    ) {
        super(name);
        if (file.modifiedAt) {
            this.mtime = Long.fromValue(file.modifiedAt!.seconds!).toNumber() * 1000;
        }
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
        await this.parent.uploadFile(this.file);
        this.data = data;
    }

    private async loadData(): Promise<Uint8Array> {
        const client = await this.ctx.byteStreamClient();
        const resourceName = makeBytestreamDownloadResourceName(this.file.sha256!, Long.fromValue(this.file.size!).toNumber());
        const buffer = Buffer.alloc(Long.fromValue(this.file.size!).toNumber());
        const call = client.read({
            resourceName: resourceName,
            readOffset: 0,
            // readLimit: 65536,
        });
        return new Promise<Buffer>((resolve, reject) => {
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
            let offset = 0;
            call.on('data', (response: ReadResponse) => {
                if (response.data instanceof Buffer) {
                    response.data.copy(buffer, offset);
                    offset += response.data.byteLength;
                }
            });
            call.on('error', reject);
            call.on('end', () => {
                resolve(buffer);
            });
        });
    }
}

function makeUserProfileDir(user: User): StaticDirNode {
    return new StaticDirNode('.profile', [
        StaticFileNode.fromJson('config.json', {
            "name": user.name,
            "avatarUrl": user.avatarUrl,
            "splashUrl": user.splashUrl,
            "email": user.email,
        }),
    ]);
}

function makeUserName(user: User): string {
    return user.login!;
}

function makeInputName(input: Input): string {
    return input.title!;
}

function makeInputContentName(input: Input): string {
    const status: InputStatus = input.status!;
    let name = input.titleSlug!;
    switch (status) {
        case InputStatus.STATUS_DRAFT:
            name += ".draft";
            break;
        case InputStatus.STATUS_PUBLISHED:
            name += ".published";
            break;
        default:
            throw vscode.FileSystemError.NoPermissions(`content status not supported: ${status}`);
    }
    name += ".md";
    return name;
}

function makeBytestreamUploadResourceName(id: string, sha256: string, size: number): string {
    return `/uploads/${id}/blobs/${sha256}/${size}`;
}

function makeBytestreamDownloadResourceName(sha256: string, size: number): string {
    return `/blobs/${sha256}/${size}`;
}

export function makeUserNodeUri(user: User): vscode.Uri {
    return vscode.Uri.parse(`stream:/${user.login}`);
}

export function makeInputNodeUri(input: Input): vscode.Uri {
    return vscode.Uri.parse(`stream:/${input.login}/${input.title}`);
}

export function makeInputContentFileNodeUri(input: Input): vscode.Uri {
    return vscode.Uri.parse(`stream:/${input.login}/${input.title}/${makeInputContentName(input)}`);
}

function makeInputAssetName(input: Input, name: string): string {
    return `/${input.login}/${input.id}/${name}`;
}

function makeInputFileName(input: Input, file: FilesetFile): string {
    const prefix = `/${input.login}/${input.id}/`;
    let filename = file.name!;
    if (filename.startsWith(prefix)) {
        filename = filename.slice(prefix.length);
    }
    return filename;
}

function makeInputExternalViewUrl(input: Input): vscode.Uri {
    return vscode.Uri.parse(`https://input.stream/@${input.login}/${input.titleSlug}/view`);
}

function makeInputExternalWatchUrl(input: Input): vscode.Uri {
    return vscode.Uri.parse(`https://input.stream/@${input.login}/${input.titleSlug}/view/watch`);
}

function sha256Bytes(buf: Buffer): string {
    const hashSum = crypto.createHash('sha256');
    hashSum.update(buf);
    const hex = hashSum.digest('hex');
    return hex;
}

function makeContentType(ext: string): string | undefined {
    const contentType = makeImageContentType(ext);
    if (contentType) {
        return contentType;
    }
    // TODO: add additional text formats?
}

function makeImageContentType(ext: string): string | undefined {
    switch (ext) {
        case '.apng':
            return 'image/apng';
        case '.avif':
            return 'image/avif';
        case '.gif':
            return 'image/gif';
        case '.jpeg':
            return 'image/jpeg';
        case '.jpg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        case '.svg':
            return 'image/svg+xml';
        case '.webp':
            return 'image/webp';
    }
}

const imageExtensionNames = ['apng', 'avif', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'];