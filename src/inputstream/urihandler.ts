import * as vscode from 'vscode';
import { CommandName } from './constants';

export class UriHandler implements vscode.UriHandler, vscode.Disposable {

    private disposables: vscode.Disposable[] = [];

    constructor() {
        this.disposables.push(vscode.window.registerUriHandler(this));
        vscode.window.showInformationMessage('urihandler installed');
    }

    public handleUri(uri: vscode.Uri) {
        vscode.window.showInformationMessage(`incoming event: ${uri.path}`);
        // await vscode.commands.executeCommand(CommandName.ViewInputstreamExplorer);

        switch (uri.path) {
            case '/init':
                return this.init(uri);
            case '/edit':
                return this.edit(uri);
        }
    }

    private async init(uri: vscode.Uri): Promise<void> {
        const query = parseQuery(uri);
        const token = query['token'];
        if (!token) {
            return;
        }
        return vscode.commands.executeCommand(CommandName.Login, token);
    }

    private async edit(uri: vscode.Uri): Promise<void> {
        const query = parseQuery(uri);
        const inputId = query['input_id'];
        if (!inputId) {
            return;
        }
        await vscode.commands.executeCommand(CommandName.InputOpen, inputId);
    }

    /**
     * @override
     */
    public dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
        vscode.window.showInformationMessage('urihandler disposed');
    }

}

function parseQuery(uri: vscode.Uri): { [key: string]: string } {
    return uri.query.split('&').reduce((prev: any, current) => {
        const queryString = current.split('=');
        prev[queryString[0]] = queryString[1];
        return prev;
    }, {});
}
