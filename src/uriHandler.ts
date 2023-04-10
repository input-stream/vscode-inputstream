import * as vscode from 'vscode';

import { BuiltInCommandName, CommandName } from './commands';
import { Context, VSCodeCommands, VSCodeWindow } from './context';
import { makeInputContentFileNodeUri } from './filesystems';
import { parseQuery } from './uris';
import { Input, _build_stack_inputstream_v1beta1_Input_Status as InputStatus } from "./proto/build/stack/inputstream/v1beta1/Input";

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
            default:
                console.warn(`vscode uri handler: unknown handler "${uri.path}" (skipping)`);
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
            console.warn(`malformed /edit uri: missing param "login"`);
            return;
        }
        const title = query['title'];
        if (!title) {
            console.warn(`malformed /edit uri: missing param "title"`);
            return;
        }
        const titleSlug = query['titleSlug'];
        if (!titleSlug) {
            console.warn(`malformed /edit uri: missing param "titleSlug"`);
            return;
        }
        const status = parseInt(query['status']) as InputStatus;
        if (!status) {
            console.warn(`malformed /edit uri: missing param "status"`);
            return;
        }
        const input: Input = {
            login,
            title,
            titleSlug,
            status,
        };
        return this.commands.executeCommand(BuiltInCommandName.Open, makeInputContentFileNodeUri(input));
    }

    private async handleCreateUri(uri: vscode.Uri): Promise<void> {
        await this.commands.executeCommand(CommandName.InputCreate);
    }

}
