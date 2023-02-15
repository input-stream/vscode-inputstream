import * as vscode from 'vscode';

import { FileEntry } from "./fileEntry";
import { Node } from "./node";


export abstract class FileNode extends Node implements FileEntry {
    public type = vscode.FileType.File;
    public get size() { return 0; }

    constructor(
        uri: vscode.Uri,
        ctime = 0,
        mtime = 0,
    ) {
        super(uri, ctime, mtime);
    }

    abstract getData(): Promise<Uint8Array>;
    abstract setData(data: Uint8Array): Promise<void>;
}
