import * as vscode from 'vscode';

import { DirNode } from './directoryNode';
import { Entry } from './entry';
import { StaticFileNode } from './staticFileNode';


export class StaticDirectoryNode extends DirNode<Entry> {
    constructor(uri: vscode.Uri) {
        super(uri);
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
