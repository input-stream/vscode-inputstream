import * as vscode from 'vscode';

import { DirNode } from './directoryNode';
import { Entry } from './entry';
import { NodeContext } from './node';
import { StaticFileNode } from './staticFileNode';
import { UserNode } from './userNode';


export class RootNode extends DirNode<Entry> {
    constructor(
        uri: vscode.Uri,
        public readonly ctx: NodeContext,
    ) {
        super(uri);
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
