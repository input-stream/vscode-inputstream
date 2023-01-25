import * as vscode from 'vscode';

import { AccountTreeDataProvider } from './login/treeview';
import { AuthServiceClient } from '../proto/build/stack/auth/v1beta1/AuthService';
import { ByteStreamGRPCClient as BytestreamGRPCClient } from './byteStreamClient';
import { Closeable, makeChannelCredentials } from './grpcclient';
import { DeviceLogin } from './deviceLogin';
import { EmptyView } from './emptyview';
import { FeatureName, ViewName } from './constants';
import { IExtensionFeature } from '../common';
import { ImageSearch } from './imagesearch/imagesearch';
import { ImageSearchClient as ImagesGRPCClient } from './imageSearchClient';
import { InputsGRPCClient } from './inputStreamClient';
import { PageController } from './page/controller';
import { PageTreeView } from './page/treeview';
import { TreeDataProvider } from './treedataprovider';
import { UriHandler } from './urihandler';
import { User } from '../proto/build/stack/auth/v1beta1/User';
import {
    createAuthServiceClient,
    createInputStreamConfiguration,
    loadAuthProtos,
    loadInputStreamProtos,
    loadByteStreamProtos,
} from './configuration';
import { Container } from '../container';

export class InputStreamFeature implements IExtensionFeature, vscode.Disposable {
    public readonly name = FeatureName;

    private disposables: vscode.Disposable[] = [];
    private closeables: Closeable[] = [];

    private inputsClient: InputsGRPCClient | undefined;
    private authClient: AuthServiceClient | undefined;
    private bytestreamClient: BytestreamGRPCClient | undefined;
    private imagesClient: ImagesGRPCClient | undefined;

    private deviceLogin: DeviceLogin | undefined;
    private accountTreeView: AccountTreeDataProvider | undefined;
    private pageTreeView: TreeDataProvider<any> | undefined;
    private pageController: PageController | undefined;

    constructor() {
        this.add(new UriHandler());
    }

    /**
     * @override
     */
    async activate(ctx: vscode.ExtensionContext, config: vscode.WorkspaceConfiguration): Promise<any> {
        const cfg = await createInputStreamConfiguration(ctx.asAbsolutePath.bind(ctx), ctx.globalStoragePath, config);

        const authProtos = loadAuthProtos(cfg.auth.protofile);
        const byteStreamProtos = loadByteStreamProtos(cfg.bytestream.protofile);
        const inputStreamProtos = loadInputStreamProtos(cfg.inputstream.protofile);

        this.authClient = createAuthServiceClient(authProtos, cfg.auth.address);
        this.deviceLogin = this.add(new DeviceLogin(ctx.globalState, this.authClient));
        this.deviceLogin.onDidAuthUserChange.event(this.handleAuthUserChange, this, this.disposables);
        this.deviceLogin.onDidLoginTokenChange.event(token => {
            this.bytestreamClient?.setToken(token);
            this.imagesClient?.setToken(token);
            this.inputsClient?.setToken(token);
        });

        this.bytestreamClient = new BytestreamGRPCClient(
            new byteStreamProtos.google.bytestream.ByteStream(
                cfg.bytestream.address,
                makeChannelCredentials(cfg.bytestream.address)
            ),
            this.deviceLogin
        );
        this.inputsClient = new InputsGRPCClient(
            new inputStreamProtos.build.stack.inputstream.v1beta1.Inputs(
                cfg.inputstream.address,
                makeChannelCredentials(cfg.inputstream.address)
            ),
            this.deviceLogin
        );
        this.imagesClient = new ImagesGRPCClient(
            new inputStreamProtos.build.stack.inputstream.v1beta1.Images(
                cfg.inputstream.address,
                makeChannelCredentials(cfg.inputstream.address)
            ),
            this.deviceLogin
        );

        this.closeables.push(this.authClient);
        this.closeables.push(this.bytestreamClient);
        this.closeables.push(this.inputsClient);
        this.closeables.push(this.imagesClient);

        this.deviceLogin.restoreSaved();

        this.add(new ImageSearch(this.imagesClient));
        this.accountTreeView = this.add(new AccountTreeDataProvider());
    }

    /**
     * When login occurs, dispose of the previous login view and replace it with 
     * a new one.
     * 
     * @param user The user that logged in
     */
    protected handleAuthUserChange(user: User) {
        this.accountTreeView!.handleAuthUserChange(user);

        const oldPageTreeView = this.pageTreeView;
        const oldPageController = this.pageController;

        this.pageController = this.add(
            new PageController(
                user,
                this.inputsClient!,
                this.bytestreamClient!,
            ));

        this.pageTreeView = this.add(
            new PageTreeView(user, this.inputsClient!),
        );

        if (oldPageController) {
            oldPageController.dispose();
        }
        if (oldPageTreeView) {
            oldPageTreeView.dispose();
        }
    }

    public deactivate() {
        this.dispose();

        // Even when deactivated/disposed we need to provide view
        // implementations declared in the package.json to avoid the 'no tree
        // view with id ...' error.
        new EmptyView(ViewName.InputExplorer, this.disposables);
        new EmptyView(ViewName.AccountExplorer, this.disposables);
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
