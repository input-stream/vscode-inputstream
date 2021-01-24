import Long = require('long');
import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';
import { Input } from '../../proto/build/stack/inputstream/v1beta1/Input';
import { InputContent } from '../../proto/build/stack/inputstream/v1beta1/InputContent';
import { ShortPostInputContent } from '../../proto/build/stack/inputstream/v1beta1/ShortPostInputContent';
import { FieldMask } from '../../proto/google/protobuf/FieldMask';
import { PsClient } from '../client';
import { Scheme } from '../constants';

/**
 * Document content provider for inputs.
 */
export class InputContentProvider implements vscode.TextDocumentContentProvider, vscode.Disposable, vscode.FileSystemProvider {
    protected disposables: vscode.Disposable[] = [];
    protected client: PsClient | undefined;
    protected files: Map<string,InputFile> = new Map();
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

    constructor(
        onDidPsClientChange: vscode.Event<PsClient>,
    ) {
        onDidPsClientChange(this.handlePsClientChange, this, this.disposables);
        vscode.workspace.onDidCloseTextDocument(this.handleTextDocumentClose, this, this.disposables);
        this.disposables.push(this._onDidChange);
        // this.disposables.push(vscode.workspace.registerTextDocumentContentProvider(Scheme.Stream, this));
        this.disposables.push(vscode.workspace.registerFileSystemProvider(Scheme.Page, this, { isCaseSensitive: true }));
    }

    handlePsClientChange(client: PsClient) {
        this.client = client;
    }

	public get onDidChange() {
		return this._onDidChange.event;
    }
    
    /**
     * Provide textual content for a given uri.
     *
     * The editor will use the returned string-content to create a readonly
     * [document](#TextDocument). Resources allocated should be released when
     * the corresponding document has been [closed](#workspace.onDidCloseTextDocument).
     *
     * **Note**: The contents of the created [document](#TextDocument) might not be
     * identical to the provided text due to end-of-line-sequence normalization.
     *
     * @param uri An uri which scheme matches the scheme this provider was [registered](#workspace.registerTextDocumentContentProvider) for.
     * @param token A cancellation token.
     * @return A string or a thenable that resolves to such.
     */
    public async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        if (!this.client) {
            return Promise.reject(`unable to open ${uri.toString()}: client connection not available`);
        }

        const parts = uri.path.split('/');
        const login = parts[0];
        const id = parts[1];
        const mask: FieldMask = {
            paths: ['content'],
        };

        try {
            const input = await this.client.getInput({ login, id }, mask);
            if (!input?.content) {
                return Promise.reject(`unable to open ${uri.toString()}: input content not available`);
            }
            return getContentSource(input.content);
        } catch (err) {
            vscode.window.showErrorMessage(`Could not get input content: ${err.message}`);
            return err;
        }

    }

    public dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
    }

    private handleTextDocumentClose(doc: vscode.TextDocument) {

    }

    private async getFile(uri: vscode.Uri): Promise<InputFile> {
        let file = this.files.get(uri.path);
        if (!file) {
            file = await this.openFile(uri);
            this.files.set(uri.path, file);
        }
        return file;
    }

    private async openFile(uri: vscode.Uri): Promise<InputFile> {
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

    async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        return this.getFile(uri);
    }

    async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        throw vscode.FileSystemError.FileNotFound(uri);
    }

    async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {
        const file = this.getFile(uri);
        if (options.create) {
            return this.createFile(uri, content);
        } 
        return this.updateFile(uri, content);
    }

    async createFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
        // const file = await this.openFile(uri);
        return this.updateFile(uri, content);
    }

    async updateFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
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

    async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        const file = await this.getFile(uri);
        return file.data!;
    }

    createDirectory(uri: vscode.Uri): void {
        throw vscode.FileSystemError.Unavailable('unsupported operation: create directory');
    }


    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
        throw vscode.FileSystemError.Unavailable('unsupported operation: rename');
    }


    delete(uri: vscode.Uri): void {
        throw vscode.FileSystemError.Unavailable('unsupported operation: delete');
    }

    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    watch(_resource: vscode.Uri): vscode.Disposable {
        // ignore, fires for all changes...
        return new vscode.Disposable(() => { });
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
        const source = getContentSource(input.content!);
        this.data = new TextEncoder().encode(source);
        this.type = vscode.FileType.File;
        this.ctime = Long.fromValue(input.createdAt!.seconds!).toNumber() * 1000;
        this.mtime = Long.fromValue(input.updatedAt!.seconds!).toNumber() * 1000;
        this.size = source.length;
        this.name = input.id + '.md';
    }
}

function getContentSource(content: InputContent): string {
    if (content.shortPost) {
        return content.shortPost.markdown || '';
    }
    return '';
}
