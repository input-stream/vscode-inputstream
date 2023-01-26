import * as vscode from 'vscode';
import { CommandName } from './commands';
import { Context, VSCodeCommands, VSCodeWindow } from './context';

/**
 * Base class for a tree view with a refresh command.
 */
export abstract class TreeController<T extends vscode.TreeItem> implements vscode.TreeDataProvider<T> {

    protected view: vscode.TreeView<T | undefined>;

    protected _onDidChangeTreeData: vscode.EventEmitter<T | undefined> = new vscode.EventEmitter<T | undefined>();
    readonly onDidChangeTreeData: vscode.Event<T | undefined> = this._onDidChangeTreeData.event;

    constructor(
        ctx: Context,
        window: VSCodeWindow,
        commands: VSCodeCommands,
        protected name: string,
    ) {
        this.view = ctx.add(window.createTreeView(this.name, {
            treeDataProvider: this,
        }));
        ctx.add(commands.registerCommand(this.name + CommandName.RefreshSuffix, this.handleCommandRefresh, this));
    }

    protected handleCommandRefresh() {
        this.refresh();
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

    protected abstract getRootItems(): Promise<T[] | undefined>;
}
