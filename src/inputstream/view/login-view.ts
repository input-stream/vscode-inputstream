import * as vscode from 'vscode';
import { CommandName, ContextValue, ViewName } from '../constants';
import { TreeDataProvider } from './treedataprovider';

export class LoginTreeDataProvider extends TreeDataProvider<vscode.TreeItem> {
    constructor() {
        super(ViewName.InputExplorer);
    }

    async getRootItems(): Promise<vscode.TreeItem[]> {
        const item = new vscode.TreeItem('Login');
        item.contextValue = ContextValue.Login,
        item.label = 'Login',
        item.description = 'Please click to login and edit items',
        item.command = {
            title: 'Login',
            command: CommandName.DeviceLogin,
        };

        return [item];
    }

}

