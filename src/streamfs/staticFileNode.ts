import * as vscode from 'vscode';

import { TextEncoder } from 'node:util';
import { FileNode } from './fileNode';


export class StaticFileNode extends FileNode {
    constructor(uri: vscode.Uri, private data: Uint8Array) {
        super(uri);
    }

    public async getData(): Promise<Uint8Array> {
        return this.data;
    }

    public async setData(data: Uint8Array): Promise<void> {
        throw vscode.FileSystemError.NoPermissions(`unsupported operation: write`);
    }

    static fromText(uri: vscode.Uri, text: string): StaticFileNode {
        return new StaticFileNode(uri, new TextEncoder().encode(text));
    }

    static fromJson(uri: vscode.Uri, data: any): StaticFileNode {
        return StaticFileNode.fromText(uri, JSON.stringify(data, null, 4));
    }
}
