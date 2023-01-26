import * as vscode from 'vscode';
import { BuiltInCommandName } from './commands';
import { VSCodeWindow, VSCodeCommands, Context } from './context';
import { User } from './proto/build/stack/auth/v1beta1/User';
import { TreeController } from './treeController';
import { loginUri } from './uris';
import { ViewName, ContextValue } from './views';

export class AccountExplorer extends TreeController<vscode.TreeItem> {
    private user: User | undefined;

    constructor(
        ctx: Context,
        window: VSCodeWindow,
        commands: VSCodeCommands,
    ) {
        super(ctx, window, commands, ViewName.AccountExplorer);
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
        const item = new vscode.TreeItem('Login');
        item.contextValue = ContextValue.Login;
        item.label = 'Login';
        item.description = 'Click to login';
        item.command = {
            title: 'Login',
            command: BuiltInCommandName.Open,
            arguments: [loginUri],
        };
        return [item];
    }

    public handleUserLogin(user: User) {
        this.user = user;
        this._onDidChangeTreeData.fire(undefined);
    }
}

