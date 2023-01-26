import * as vscode from "vscode";

/**
 * Context provides common component features like a disposable store.
 */
export interface Context {
    add<T extends vscode.Disposable>(d: T): T;
    readonly extensionUri: vscode.Uri;
}

export interface VSCodeEnv {
    clipboard: vscode.Clipboard;
    openExternal(target: vscode.Uri): Thenable<boolean>;
}

export interface VSCodeCommands {
    registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): vscode.Disposable;
    executeCommand<T = unknown>(command: string, ...rest: any[]): Thenable<T>;
}

export interface VSCodeWindow {
    activeTextEditor: vscode.TextEditor | undefined;
    setStatusBarMessage(text: string, hideAfterTimeout: number): vscode.Disposable;
    showWarningMessage<T extends string>(message: string, ...items: T[]): Thenable<T | undefined>;
    showErrorMessage<T extends string>(message: string, ...items: T[]): Thenable<T | undefined>;
    registerUriHandler(handler: vscode.UriHandler): vscode.Disposable;
    createTreeView<T>(viewId: string, options: vscode.TreeViewOptions<T>): vscode.TreeView<T>;
    createWebviewPanel(viewType: string, title: string, showOptions: vscode.ViewColumn | { readonly viewColumn: vscode.ViewColumn; readonly preserveFocus?: boolean }, options?: vscode.WebviewPanelOptions & vscode.WebviewOptions): vscode.WebviewPanel;
}

export interface VSCodeWorkspace {
    readonly fs: vscode.FileSystem;
    workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined;
    updateWorkspaceFolders(start: number, deleteCount: number | undefined | null, ...workspaceFoldersToAdd: { readonly uri: vscode.Uri; readonly name?: string }[]): boolean;
    registerFileSystemProvider(scheme: string, provider: vscode.FileSystemProvider, options?: { readonly isCaseSensitive?: boolean; readonly isReadonly?: boolean }): vscode.Disposable;
}
