import * as vscode from 'vscode';

import { CommandName } from './commands';
import { TreeController } from './treeController';
import { User } from './proto/build/stack/auth/v1beta1/User';
import { ViewName, ContextValue, TreeItemLabels, CommandDescriptions } from './views';
import { VSCodeWindow, VSCodeCommands, Context } from './context';

export class ProfileExplorer extends TreeController<vscode.TreeItem> {
    private user: User | undefined;

    constructor(
        ctx: Context,
        window: VSCodeWindow,
        commands: VSCodeCommands,
    ) {
        super(ctx, window, commands, ViewName.ProfileExplorer);
    }

    getRootItems(): Promise<vscode.TreeItem[]> {
        if (this.user) {
            return this.getUserItems(this.user);
        } else {
            return this.getLoginItems();
        }
    }

    private async getUserItems(user: User): Promise<vscode.TreeItem[]> {
        const item = new vscode.TreeItem(`@${user.login}`);
        item.description = `${user.name}`;
        return [item];
    }

    private async getLoginItems(): Promise<vscode.TreeItem[]> {
        const item = new vscode.TreeItem(TreeItemLabels.Login);
        item.contextValue = ContextValue.Login;
        item.description = CommandDescriptions.ClickToLogin;
        item.command = {
            title: TreeItemLabels.Login,
            command: CommandName.Login,
        };
        return [item];
    }

    public handleUserLogin(user: User) {
        this.user = user;
        this._onDidChangeTreeData.fire(undefined);
    }

    public handleUserLogout() {
        this.user = undefined;
        this._onDidChangeTreeData.fire(undefined);
    }

}

