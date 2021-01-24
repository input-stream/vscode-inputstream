import Long = require('long');
import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';
import { Input } from '../../proto/build/stack/inputstream/v1beta1/Input';
import { ShortPostInputContent } from '../../proto/build/stack/inputstream/v1beta1/ShortPostInputContent';
import { FieldMask } from '../../proto/google/protobuf/FieldMask';
import { InputStreamClient } from '../client';
import { Scheme } from '../constants';

/**
 * Document content provider for input pages.  Modeled after https://github.com/microsoft/vscode-extension-samples/blob/9b8701dceac5fab83345356743170bca609c87f9/fsprovider-sample/src/fileSystemProvider.ts
 */
export class PageFileSystemProvider implements vscode.Disposable, vscode.FileSystemProvider {
    protected disposables: vscode.Disposable[] = [];
    protected client: InputStreamClient | undefined;
    protected files: Map<string,InputFile> = new Map();
    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    constructor(
        onDidInputStreamClientChange: vscode.Event<InputStreamClient>,
    ) {
        onDidInputStreamClientChange(this.handleInputStreamClientChange, this, this.disposables);
        vscode.workspace.onDidCloseTextDocument(this.handleTextDocumentClose, this, this.disposables);
        this.disposables.push(vscode.workspace.registerFileSystemProvider(Scheme.Page, this, { isCaseSensitive: true }));
    }

    private handleInputStreamClientChange(client: InputStreamClient) {
        this.client = client;
    }
    
    private handleTextDocumentClose(doc: vscode.TextDocument) {
    }

    protected async getFile(uri: vscode.Uri): Promise<InputFile> {
        let file = this.files.get(uri.path);
        if (!file) {
            file = await this.openFile(uri);
            this.files.set(uri.path, file);
        }
        return file;
    }

    protected async openFile(uri: vscode.Uri): Promise<InputFile> {
        if (!this.client) {
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
            const input = await this.client.getInput({ login, id }, mask);
            return new InputFile(input!);
        } catch (err) {
            vscode.window.showErrorMessage(`Could not get input content: ${err.message}`);
            return err;
        }
    }

    protected async createFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
        // const file = await this.openFile(uri);
        return this.updateFile(uri, content);
    }

    protected async updateFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
        if (!this.client) {
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

        const response = await this.client.updateInput(file.input, mask);
        file.input = response!.input!;
        // this.onDidInputChange.fire(response.input);
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

    public createDirectory(uri: vscode.Uri): void {
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

    public dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
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
        public input: Input) {
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
