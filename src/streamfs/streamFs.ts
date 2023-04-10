import * as vscode from 'vscode';

import { Context, VSCodeWindow, VSCodeWorkspace } from '../context';
import { DirNode } from './directoryNode';
import { Entry } from './entry';
import { FileNode } from './fileNode';
import { IByteStreamClient } from '../byteStreamClient';
import { IInputsClient } from '../inputsClient';
import { InputNode } from './inputNode';
import { RootNode } from './rootNode';
import { Scheme, streamRootUri } from '../filesystems';
import { UserNode } from './userNode';
import { Utils } from 'vscode-uri';
import { Barrier } from 'vscode-common/out/async';


export type selectPredicate = (child: Entry) => boolean;
export const defaultSelectPredicate = (child: Entry) => { return false; };
export const inputNodePredicate = (child: Entry) => child instanceof InputNode;
export const userNodePredicate = (child: Entry) => child instanceof UserNode;

const debug = false;

interface FileUploader {
    upload(source: vscode.Uri, target: vscode.Uri, options: { overwrite: boolean }): Thenable<void>;
}

/**
 * Document content provider for input pages.  
 *
 * Modeled after
 * https://github.com/microsoft/vscode-extension-samples/blob/9b8701dceac5fab83345356743170bca609c87f9/fsprovider-sample/src/fileSystemProvider.ts
 */
export class StreamFs implements vscode.FileSystemProvider {

    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;
    private _ready: Barrier;

    public root: RootNode;

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    constructor(
        ctx: Context,
        workspace: VSCodeWorkspace,
        window: VSCodeWindow,
        inputsClient: IInputsClient,
        byteStreamClient: IByteStreamClient,
        private uploader: FileUploader,
    ) {
        ctx.add(workspace.registerFileSystemProvider(Scheme.Stream, this, {
            isCaseSensitive: true,
            isReadonly: false
        }));
        ctx.add(window.registerFileDecorationProvider(this));

        const nodeContext = {
            window,
            inputsClient,
            byteStreamClient,
            notifyFileChanges: this._fireSoon.bind(this),
        };

        this.root = new RootNode(streamRootUri, nodeContext);
        this._ready = new Barrier();
    }

    public setReady(): void {
        this._ready.open();
    }

    public async provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): Promise<vscode.FileDecoration | null | undefined> {
        const node = await this.lookup(uri, true);
        if (!node) {
            return undefined;
        }
        return node.decorate(token);
    }

    public async lookup<T extends Entry>(uri: vscode.Uri, silent: false, select?: selectPredicate): Promise<T>;
    public async lookup<T extends Entry>(uri: vscode.Uri, silent: boolean, select?: selectPredicate): Promise<T | undefined>;
    public async lookup<T extends Entry>(uri: vscode.Uri, silent: boolean, select: selectPredicate = defaultSelectPredicate): Promise<T | undefined> {
        const isReady = await this._ready.wait();
        if (!isReady) {
            throw vscode.FileSystemError.Unavailable('filesystem not ready');
        }
        const parts = uri.path.split('/');
        let entry: Entry = this.root;
        for (const part of parts) {
            if (!part) {
                continue;
            }
            let child: Entry | undefined;
            // this.log(`lookup '${part}' in ${uri.path}`, entry);
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

    async lookupAsDirectory(uri: vscode.Uri, silent: boolean): Promise<DirNode<Entry>> {
        const entry = await this.lookup(uri, silent);
        if (entry instanceof DirNode) {
            return entry;
        }
        throw vscode.FileSystemError.FileNotADirectory(uri);
    }

    async lookupAsFile(uri: vscode.Uri, silent: boolean): Promise<FileNode> {
        const entry = await this.lookup(uri, silent);
        if (entry instanceof FileNode) {
            return entry;
        }
        throw vscode.FileSystemError.FileIsADirectory(uri);
    }

    lookupParentDirectory(uri: vscode.Uri): Promise<DirNode<Entry>> {
        return this.lookupAsDirectory(Utils.dirname(uri), false);
    }

    /**
     * stat implements part of the vscode.FileSystemProvider interface.
     * @param uri 
     * @returns 
     */
    public async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        try {
            const info = await this.lookup(uri, false);
            this.log(`stat ok:`, uri);
            return info;
        } catch (e) {
            this.log(`stat error:`, uri, (e as Error).message);
            throw e;
        }
    }

    /**
     * readDirectory implements part of the vscode.FileSystemProvider interface.
     * @param uri 
     */
    public async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        const entry = await this.lookupAsDirectory(uri, false);
        const result: [string, vscode.FileType][] = [];
        for (const child of await entry.getChildren()) {
            result.push([child.name, child.type]);
        }
        this.log(`readDirectory:`, uri.toString(), `(${result.length} entries)`);
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
        this.log(`writeFile:`, uri);

        const basename = Utils.basename(uri);
        const parent = await this.lookupParentDirectory(uri);

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
        this.log(`readFile:`, uri);
        const file = await this.lookupAsFile(uri, false);
        return file.getData();
    }

    /**
     * createDirectory implements part of the vscode.FileSystemProvider interface.
     * @param uri 
     */
    public async createDirectory(uri: vscode.Uri): Promise<void> {
        this.log(`createDirectory:`, uri);

        const basename = Utils.basename(uri);
        const dirname = Utils.dirname(uri);
        const parent = await this.lookupAsDirectory(dirname, false);

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
        this.log(`rename:`, oldUri, newUri);

        if (!options.overwrite && await this.lookup(newUri, true)) {
            throw vscode.FileSystemError.FileExists(newUri);
        }

        const entry = await this.lookup(oldUri, false);
        const oldParent = await this.lookupParentDirectory(oldUri);
        const newParent = await this.lookupParentDirectory(newUri);
        const newName = Utils.basename(newUri);

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
        this.log(`delete:`, uri);

        const dirname = Utils.dirname(uri);
        const parent = await this.lookupAsDirectory(dirname, false);
        const basename = Utils.basename(uri);

        await parent.deleteChild(basename);

        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { uri, type: vscode.FileChangeType.Deleted });
    }

    /**
     * watch implements part of the vscode.FileSystemProvider interface.
     * @param _resource 
     * @returns 
     */
    public watch(_resource: vscode.Uri): vscode.Disposable {
        this.log(`watch:`, _resource);
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
        this.log(`copy:`, source, target);
        if (target.authority === 'img.input.stream') {
            return this.uploader.upload(source, target, options);
        }
        throw vscode.FileSystemError.NoPermissions(`unsupported operation: copy to ${target.scheme}://${target.authority}`);
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

    private log(msg: string, ...args: any[]) {
        if (debug) {
            console.log(msg, ...args);
        }
    }

}
