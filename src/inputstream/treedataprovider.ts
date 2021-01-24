import * as vscode from 'vscode';
import { CommandName } from './constants';

/**
 * Base class for a tree view with a refresh command.
 */
export abstract class TreeDataProvider<T> implements vscode.Disposable, vscode.TreeDataProvider<T> {
    protected view: vscode.TreeView<T | undefined>;
    protected disposables: vscode.Disposable[] = [];
    protected _onDidChangeTreeData: vscode.EventEmitter<T | undefined> = new vscode.EventEmitter<T | undefined>();
    readonly onDidChangeTreeData: vscode.Event<T | undefined> = this._onDidChangeTreeData.event;

    constructor(
        protected name: string,
    ) {
        const view = this.view = vscode.window.createTreeView(this.name, {
            treeDataProvider: this,
        });
        this.disposables.push(view);
        this.registerCommands();
    }

    protected registerCommands() {
        const refreshCommandName = this.name + CommandName.RefreshSuffix;
        this.disposables.push(vscode.commands.registerCommand(refreshCommandName, this.handleCommandRefresh, this));
    }

    protected handleCommandRefresh() {
        this.refresh();
    }
    
    protected addCommand(name: string, command: (...args: any) => any) {
        this.disposables.push(vscode.commands.registerCommand(name, command, this));
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    public getTreeItem(element: T): vscode.TreeItem {
        return element;
    }

    public async getParent(node?: T | undefined): Promise<T | undefined> {
        return undefined;
    }

    public async getChildren(element?: T): Promise<T[] | undefined> {
        if (element) {
            return [];
        }
        return this.getRootItems();
    }

    protected abstract async getRootItems(): Promise<T[] | undefined>;

    public dispose() {
        vscode.commands.executeCommand(this.name + CommandName.RefreshSuffix);

        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
    }
}
