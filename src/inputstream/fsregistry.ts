import * as vscode from 'vscode';

export interface FsRegistry {
    getFsForURI(uri: vscode.Uri): vscode.FileSystem | undefined
}
