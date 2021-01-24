import * as vscode from 'vscode';
import { IExtensionFeature } from '../common';
import { AuthServiceClient } from '../proto/build/stack/auth/v1beta1/AuthService';
import { User } from '../proto/build/stack/auth/v1beta1/User';
import { Input } from '../proto/build/stack/inputstream/v1beta1/Input';
import { InputStreamClient as InputStreamClient } from './client';
import {
    createAuthServiceClient,
    createInputStreamConfiguration,
    loadAuthProtos,
    loadPsProtos,
} from './configuration';
import { FeatureName, ViewName } from './constants';
import { DeviceLogin } from './device_login';
import { Closeable } from './grpcclient';
import { ImageSearch } from './imagesearch/imagesearch';
import { UriHandler } from './urihandler';
import { EmptyView } from './emptyview';
import { PageFileSystemProvider } from './page/filesystem';
import { PageTreeView } from './page/treeview';
import { LoginTreeDataProvider } from './login/treeview';
import { TreeDataProvider } from './treedataprovider';

export class InputStreamFeature implements IExtensionFeature, vscode.Disposable {
    public readonly name = FeatureName;

    private disposables: vscode.Disposable[] = [];
    private closeables: Closeable[] = [];
    private client: InputStreamClient | undefined;
    private onDidInputStreamClientChange = new vscode.EventEmitter<InputStreamClient>();
    private onDidInputChange = new vscode.EventEmitter<Input>();
    private authClient: AuthServiceClient | undefined;
    private deviceLogin: DeviceLogin | undefined;
    private pageTreeView: TreeDataProvider<any> | undefined;

    constructor() {
        this.add(this.onDidInputStreamClientChange);
        this.add(this.onDidInputChange);
        this.add(new UriHandler());
    }

    /**
     * @override
     */
    async activate(ctx: vscode.ExtensionContext, config: vscode.WorkspaceConfiguration): Promise<any> {
        const cfg = await createInputStreamConfiguration(ctx.asAbsolutePath.bind(ctx), ctx.globalStoragePath, config);

        const psProtos = loadPsProtos(cfg.inputstream.protofile);
        const authProtos = loadAuthProtos(cfg.auth.protofile);

        this.authClient = createAuthServiceClient(authProtos, cfg.auth.address);
        this.authClient.getChannel().getTarget();
        this.closeables.push(this.authClient);

        this.add(
            new PageFileSystemProvider(this.onDidInputStreamClientChange.event));
        this.add(
            new ImageSearch(this.onDidInputStreamClientChange.event));
        this.pageTreeView = this.add(
            new LoginTreeDataProvider());
        this.deviceLogin = this.add(
            new DeviceLogin(this.authClient));

        this.deviceLogin.onDidAuthUserChange.event(this.handleAuthUserChange, this, this.disposables);
        this.deviceLogin.onDidLoginTokenChange.event(token => {
            this.client = this.add(
                new InputStreamClient(psProtos, cfg.inputstream.address, token, () => this.deviceLogin!.refreshAccessToken()));
            this.onDidInputStreamClientChange.fire(this.client);
        }, this.disposables);

        this.deviceLogin.restoreSaved();
    }

    /**
     * When login occurs, dispose of the previous login view and replace it with 
     * a new one.
     * 
     * @param user The user that logged in
     */
    protected handleAuthUserChange(user: User) {
        this.pageTreeView?.dispose();

        this.pageTreeView = this.add(
            new PageTreeView(
                this.onDidInputStreamClientChange.event,
                user,
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
