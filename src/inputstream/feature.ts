import path = require('path');
import * as vscode from 'vscode';
import { IExtensionFeature } from '../common';
import { AuthServiceClient } from '../proto/build/stack/auth/v1beta1/AuthService';
import { User } from '../proto/build/stack/auth/v1beta1/User';
import { Input } from '../proto/build/stack/inputstream/v1beta1/Input';
import { PsClient as PsClient } from './client';
import {
    createAuthServiceClient,
    createPsConfiguration,
    loadAuthProtos,
    loadPsProtos,
    PsConfiguration
} from './configuration';
import { CommandName, FeatureName, ViewName } from './constants';
import { DeviceLogin } from './device_login';
import { Closeable } from './grpcclient';
import { ImageSearch } from './imagesearch/imagesearch';
import { EmptyView } from './view/emptyview';
import { InputView } from './view/input-view';
import { LoginTreeDataProvider } from './view/login-view';
import { TreeDataProvider } from './view/treedataprovider';

export class PsFeature implements IExtensionFeature, vscode.UriHandler, vscode.Disposable {
    public readonly name = FeatureName;

    private disposables: vscode.Disposable[] = [];
    private closeables: Closeable[] = [];
    private cfg: PsConfiguration | undefined;
    private client: PsClient | undefined;
    private onDidPsClientChange = new vscode.EventEmitter<PsClient>();
    private onDidInputChange = new vscode.EventEmitter<Input>();
    private authClient: AuthServiceClient | undefined;
    private deviceLogin: DeviceLogin | undefined;
    private inputView: TreeDataProvider<any> | undefined;

    constructor() {
        this.add(this.onDidPsClientChange);
        this.add(this.onDidInputChange);
        this.add(vscode.window.registerUriHandler(this));
    }

    /**
     * @override
     */
    async activate(ctx: vscode.ExtensionContext, config: vscode.WorkspaceConfiguration): Promise<any> {
        const cfg = this.cfg = await createPsConfiguration(ctx.asAbsolutePath.bind(ctx), ctx.globalStoragePath, config);

        const psProtos = loadPsProtos(cfg.inputstream.protofile);
        const authProtos = loadAuthProtos(cfg.auth.protofile);

        this.authClient = createAuthServiceClient(authProtos, cfg.auth.address);
        this.authClient.getChannel().getTarget();
        this.closeables.push(this.authClient);

        this.inputView = this.add(
            new LoginTreeDataProvider());
        this.deviceLogin = this.add(
            new DeviceLogin(this.authClient));

        this.deviceLogin.onDidAuthUserChange.event(this.handleAuthUserChange, this, this.disposables);

        this.add(this.deviceLogin.onDidLoginTokenChange.event(token => {
            this.client = this.add(
                new PsClient(psProtos, cfg.inputstream.address, token, () => this.deviceLogin!.refreshAccessToken()));
            this.onDidPsClientChange.fire(this.client);
        }));

        this.add(
            new ImageSearch(this.onDidPsClientChange.event));

        this.deviceLogin.restoreSaved();
    }

    /**
     * When login occurs, dispose of the previous login view and replace it with 
     * a new one.
     * 
     * @param user The user that logged in
     */
    protected handleAuthUserChange(user: User) {
        this.inputView?.dispose();

        this.inputView = this.add(
            new InputView(
                this.cfg!.inputstream,
                user,
                this.client,
                this.onDidPsClientChange.event,
                this.onDidInputChange,
            ),
        );
    }

    public deactivate() {
        this.dispose();

        // Even when deactivated/disposed we need to provide view
        // implementations declared in the package.json to avoid the 'no tree
        // view with id ...' error.
        new EmptyView(ViewName.InputExplorer, this.disposables);
    }

    protected add<T extends vscode.Disposable>(disposable: T): T {
        this.disposables.push(disposable);
        return disposable;
    }

    public async handleUri(uri: vscode.Uri): Promise<void> {
        vscode.window.showInformationMessage(`incoming event: ${uri.path}`);
        await vscode.commands.executeCommand(CommandName.ViewInputstreamExplorer);

        switch (uri.path) {
            case '/init':
                return this.handleUriInit(uri);
            case '/open':
                return this.handleUriOpen(uri);
        }
    }

    private async handleUriInit(uri: vscode.Uri): Promise<void> {
        const query = parseQuery(uri);
        const token = query['token'];
        if (!token) {
            return;
        }
        return vscode.commands.executeCommand(CommandName.Login, token);
    }

    private async handleUriOpen(uri: vscode.Uri): Promise<void> {
        // expecting "/open/uuid"
        await vscode.commands.executeCommand(CommandName.InputOpen, path.basename(uri.path));
    }

    /**
     * @override
     */
    public dispose() {
        for (const closeable of this.closeables) {
            closeable.close();
        }
        this.closeables.length = 0;
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
    }

}

export class UriEventHandler extends vscode.EventEmitter<vscode.Uri> implements vscode.UriHandler {
    public handleUri(uri: vscode.Uri) {
        this.fire(uri);
    }
}

function parseQuery(uri: vscode.Uri): { [key: string]: string } {
    return uri.query.split('&').reduce((prev: any, current) => {
        const queryString = current.split('=');
        prev[queryString[0]] = queryString[1];
        return prev;
    }, {});
}

