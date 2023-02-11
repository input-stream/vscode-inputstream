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
                return this.handleLoginUri(uri);
            case '/edit':
                return this.handleEditUri(uri);
            case '/create':
                return this.handleCreateUri(uri);
            case '/open':
                return this.handleOpenUri(uri);
        }
    }

    // ===================== PRIVATE =====================

    private async handleLoginUri(uri: vscode.Uri): Promise<void> {
        const query = parseQuery(uri);
        const token = query['token'] || query['jwt'];
        if (!token) {
            return;
        }
        return this.commands.executeCommand(CommandName.JwtLogin, token);
    }

    private async handleOpenUri(uri: vscode.Uri): Promise<void> {
        // return this.commands.executeCommand(CommandName.ViewInputstreamExplorer);
        return this.commands.executeCommand(BuiltInCommandName.Open, 'stream:/');
    }

    private async handleEditUri(uri: vscode.Uri): Promise<void> {
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

    private async handleCreateUri(uri: vscode.Uri): Promise<void> {
        await this.commands.executeCommand(CommandName.InputCreate);
    }

}

