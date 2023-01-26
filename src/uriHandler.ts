import * as vscode from 'vscode';

import { BuiltInCommandName, CommandName } from './commands';
import { Context, VSCodeCommands, VSCodeWindow } from './context';
import { makeInputNodeUri } from './filesystems';
import { parseQuery } from './uris';

export class UriHandler implements vscode.UriHandler {
    constructor(
        ctx: Context,
        window: VSCodeWindow,
        private commands: VSCodeCommands,
    ) {
        ctx.add(window.registerUriHandler(this));
    }

    // ===================== PUBLIC =====================

    public async handleUri(uri: vscode.Uri) {
        await this.commands.executeCommand(CommandName.ViewInputstreamExplorer);

        switch (uri.path) {
            case '/login':
                return this.login(uri);
            case '/edit':
                return this.edit(uri);
            case '/create':
                return this.create(uri);
        }
    }

    // ===================== PRIVATE =====================

    private async login(uri: vscode.Uri): Promise<void> {
        const query = parseQuery(uri);
        const token = query['token'];
        if (!token) {
            return;
        }
        return this.commands.executeCommand(CommandName.LoginToken, token);
    }

    private async edit(uri: vscode.Uri): Promise<void> {
        const query = parseQuery(uri);
        const login = query['login'];
        if (!login) {
            return;
        }
        const title = query['title'];
        if (!title) {
            return;
        }
        return this.commands.executeCommand(BuiltInCommandName.Open, makeInputNodeUri({ login, title }));
    }

    private async create(uri: vscode.Uri): Promise<void> {
        await this.commands.executeCommand(CommandName.InputCreate);
    }

}

