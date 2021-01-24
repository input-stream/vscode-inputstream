import * as vscode from 'vscode';
import { BuiltInCommands } from '../../constants';
import { ContextValue, ViewName } from '../constants';
import { TreeDataProvider } from '../treedataprovider';

export class LoginTreeDataProvider extends TreeDataProvider<vscode.TreeItem> {
    constructor() {
        super(ViewName.InputExplorer);
    }

    async getRootItems(): Promise<vscode.TreeItem[]> {
        const loginUri = vscode.Uri.parse('https://input.stream/settings/extensions/stackbuild.vscode-inputstream/login');

        const item = new vscode.TreeItem('Login');
        item.contextValue = ContextValue.Login,
        item.label = 'Login',
        item.description = 'Click to login',
        item.command = {
            title: 'Login',
            command: BuiltInCommands.Open,
            arguments: [loginUri],
        };

        return [item];
    }

}

