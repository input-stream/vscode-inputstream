import * as vscode from 'vscode';
import { FileStat } from "vscode";


export interface Entry extends FileStat {
    name: string;
    decorate(token: vscode.CancellationToken): Promise<vscode.FileDecoration | null | undefined>;
}
