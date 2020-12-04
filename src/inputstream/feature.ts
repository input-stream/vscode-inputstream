import * as vscode from 'vscode';
import { IExtensionFeature } from '../common';
import { AuthServiceClient } from '../proto/build/stack/auth/v1beta1/AuthService';
import { Input } from '../proto/build/stack/inputstream/v1beta1/Input';
import { PsClient as PsClient } from './client';
import {
    createAuthServiceClient,
    createPsConfiguration,
    loadAuthProtos,
    loadPsProtos
} from './configuration';
import { FeatureName, ViewName } from './constants';
import { DeviceLogin } from './device_login';
import { Closeable } from './grpcclient';
import { EmptyView } from './view/emptyview';
import { InputsView } from './view/inputs';
import { PsFileExplorer } from './view/psfs';

export class PsFeature implements IExtensionFeature, vscode.Disposable {
    public readonly name = FeatureName;

    private disposables: vscode.Disposable[] = [];
    private closeables: Closeable[] = [];
    private client: PsClient | undefined;
    private onDidPsClientChange = new vscode.EventEmitter<PsClient>();
    private onDidInputChange = new vscode.EventEmitter<Input>();
    private authClient: AuthServiceClient | undefined;
    private deviceLogin: DeviceLogin | undefined;
    
    constructor() {
        this.add(this.onDidPsClientChange);
        this.add(this.onDidInputChange);
    }

    /**
     * @override
     */
    async activate(ctx: vscode.ExtensionContext, config: vscode.WorkspaceConfiguration): Promise<any> {
        const cfg = await createPsConfiguration(ctx.asAbsolutePath.bind(ctx), ctx.globalStoragePath, config);

        const psProtos = loadPsProtos(cfg.inputstream.protofile);
        const authProtos = loadAuthProtos(cfg.auth.protofile);

        this.authClient = createAuthServiceClient(authProtos, cfg.auth.address);
        this.authClient.getChannel().getTarget();
        this.closeables.push(this.authClient);
        
        this.deviceLogin = this.add(new DeviceLogin(this.authClient));

        this.add(
            new InputsView(
                this.onDidPsClientChange.event,
                this.deviceLogin.onDidAuthUserChange.event,
                this.onDidInputChange,
            ),
        );

        this.add(this.deviceLogin.onDidLoginTokenChange.event(token => {
            this.client = this.add(
                new PsClient(psProtos, cfg.inputstream.address, token));
            this.onDidPsClientChange.fire(this.client);
        }));

        this.add(new PsFileExplorer(this.onDidInputChange.event));

        this.deviceLogin.restoreSaved();
    }

    public deactivate() {
        this.dispose();

        // Even when deactivated/disposed we need to provide view implementations
        // declared in the package.json to avoid the 'no tree view with id ...' error.
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

