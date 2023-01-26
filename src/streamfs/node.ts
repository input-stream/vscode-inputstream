import * as vscode from 'vscode';
import Long from "long";

import { IByteStreamClient } from "../byteStreamClient";
import { IInputsClient } from "../inputStreamClient";
import { Timestamp } from "../proto/google/protobuf/Timestamp";
import { Utils } from 'vscode-uri';

export type NodeContext = {
    inputsClient: IInputsClient;
    byteStreamClient: IByteStreamClient;
    notifyFileChanges(...events: vscode.FileChangeEvent[]): void
}

export abstract class Node {
    public name: string;

    protected _ctime: number;
    protected _mtime: number;

    constructor(
        public readonly uri: vscode.Uri,
        ctime = 0,
        mtime = 0,
    ) {
        this.name = Utils.basename(uri);
        this._ctime = ctime;
        this._mtime = mtime;
    }

    public get ctime() { return this._ctime; }

    public get mtime() { return this._mtime; }

    protected set mtimeTimestamp(ts: Timestamp | null | undefined) {
        if (ts && typeof ts.seconds !== 'undefined') {
            this._mtime = Long.fromValue(ts.seconds).toNumber() * 1000;
        }
    }

    protected set ctimeTimestamp(ts: Timestamp | null | undefined) {
        if (ts && typeof ts.seconds !== 'undefined') {
            this._ctime = Long.fromValue(ts.seconds).toNumber() * 1000;
        }
    }

}
