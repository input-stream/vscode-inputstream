import * as vscode from 'vscode';
import { Telemetry } from '../constants';
import { Container } from '../container';
import { CommandName } from './constants';

export class UriHandler implements vscode.UriHandler, vscode.Disposable {

    private disposables: vscode.Disposable[] = [];

    constructor() {
        this.disposables.push(vscode.window.registerUriHandler(this));
    }

    public async handleUri(uri: vscode.Uri) {
        await vscode.commands.executeCommand(CommandName.ViewInputstreamExplorer);

        switch (uri.path) {
            case '/login':
                return this.login(uri);
            case '/edit':
                return this.edit(uri);
            case '/create':
                return this.create(uri);
        }
    }

    private async login(uri: vscode.Uri): Promise<void> {
        const query = parseQuery(uri);
        const token = query['token'];
        if (!token) {
            return;
        }
        Container.telemetry.sendTelemetryEvent(Telemetry.Login);
        return vscode.commands.executeCommand(CommandName.Login, token);
    }

    private async edit(uri: vscode.Uri): Promise<void> {
        const query = parseQuery(uri);
        const inputId = query['input_id'];
        if (!inputId) {
            return;
        }
        Container.telemetry.sendTelemetryEvent(Telemetry.Edit);
        await vscode.commands.executeCommand(CommandName.InputOpen, inputId);
    }

    private async create(uri: vscode.Uri): Promise<void> {
        Container.telemetry.sendTelemetryEvent(Telemetry.Create);
        await vscode.commands.executeCommand(CommandName.InputCreate);
    }

    /**
     * @override
     */
    public dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
    }

}

export function parseQuery(uri: vscode.Uri): { [key: string]: string } {
    return uri.query.split('&').reduce((prev: any, current) => {
        const queryString = current.split('=');
        prev[queryString[0]] = queryString[1];
        return prev;
    }, {});
}
