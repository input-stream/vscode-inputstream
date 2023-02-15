import * as vscode from 'vscode';

import { DirectoryEntry } from "./directoryEntry";
import { Entry } from "./entry";
import { Node } from "./node";


export abstract class DirNode<T extends Entry> extends Node implements DirectoryEntry<T> {
    private _children: Map<string, T>;

    public type = vscode.FileType.Directory;
    public get size(): number { return this._children.size; }

    constructor(
        uri: vscode.Uri,
        ctime = 0,
        mtime = 0,
    ) {
        super(uri, ctime, mtime);
        this._children = new Map();
    }

    public addChild<C extends T>(child: C): C {
        this._children.set(child.name, child);
        return child;
    }

    public removeChild(child: T): void {
        this._children.delete(child.name);
    }

    async getChild(name: string): Promise<T | undefined> {
        return this._children.get(name);
    }

    async getChildren(): Promise<T[]> {
        return Array.from(this._children.values());
    }

    abstract rename(src: string, dst: string): Promise<T>;
    abstract createFile(name: string, data?: Uint8Array): Promise<T>;
    abstract createDirectory(name: string): Promise<T>;
    abstract deleteChild(name: string): Promise<void>;
}
