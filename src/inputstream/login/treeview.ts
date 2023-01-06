import * as vscode from 'vscode';
import { BuiltInCommands } from '../../constants';
import { ContextValue, ViewName } from '../constants';
import { TreeDataProvider } from '../treedataprovider';
import { User } from '../../proto/build/stack/auth/v1beta1/User';

export class AccountTreeDataProvider extends TreeDataProvider<vscode.TreeItem> {
    private user: User | undefined;

    constructor() {
        super(ViewName.AccountExplorer);
    }

    async getRootItems(): Promise<vscode.TreeItem[]> {
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
        const loginUri = vscode.Uri.parse('https://input.stream/settings/extensions/stackbuild.vscode-inputstream/login');
        const item = new vscode.TreeItem('Login');
        item.contextValue = ContextValue.Login;
        item.label = 'Login';
        item.description = 'Click to login';
        item.command = {
            title: 'Login',
            command: BuiltInCommands.Open,
            arguments: [loginUri],
        };
        return [item];
    }

    public handleAuthUserChange(user: User) {
        this.user = user;
        this._onDidChangeTreeData.fire(undefined);
    }
}

