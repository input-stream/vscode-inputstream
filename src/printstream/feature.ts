import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import { IExtensionFeature } from '../common';
import { Container } from '../container';
import { AuthServiceClient } from '../proto/build/stack/auth/v1beta1/AuthService';
import { LoginResponse } from '../proto/build/stack/auth/v1beta1/LoginResponse';
import { User } from '../proto/build/stack/auth/v1beta1/User';
import { PsClient as PsClient } from './client';
import {
    createAuthServiceClient,
    createPsConfiguration,
    loadAuthProtos,
    loadPsProtos
} from './configuration';
import { CommandName, MementoName, ViewName } from './constants';
import { Closeable } from './grpcclient';
import { EmptyView } from './view/emptyview';
import { GitHubOAuthFlow } from './view/githubOAuthFlow';
import { PostsView } from './view/posts';
import { PsFileSystem } from './view/psfs';

export const PsFeatureName = 'print.stream.posts';

export class PsFeature implements IExtensionFeature, vscode.Disposable {
    public readonly name = PsFeatureName;

    private disposables: vscode.Disposable[] = [];
    private closeables: Closeable[] = [];
    private client: PsClient | undefined;
    private onDidPsClientChange = new vscode.EventEmitter<PsClient>();
    private onDidLoginTokenChange = new vscode.EventEmitter<string>();
    private onDidAuthUserChange = new vscode.EventEmitter<User>();
    private githubOauth: GitHubOAuthFlow | undefined;

    constructor() {
        this.add(this.onDidPsClientChange);
        this.add(this.onDidLoginTokenChange);
        this.add(this.onDidAuthUserChange);
    }

    /**
     * @override
     */
    async activate(ctx: vscode.ExtensionContext, config: vscode.WorkspaceConfiguration): Promise<any> {
        const cfg = await createPsConfiguration(ctx.asAbsolutePath.bind(ctx), ctx.globalStoragePath, config);

        const psProtos = loadPsProtos(cfg.printstream.protofile);
        const authProtos = loadAuthProtos(cfg.auth.protofile);
        const authClient = createAuthServiceClient(authProtos, cfg.auth.address);
        
        this.githubOauth = this.add(
            new GitHubOAuthFlow(cfg.printstream.githubOAuthRelayUrl),
        );
        this.add(
            new PostsView(
                this.onDidPsClientChange.event,
                this.onDidAuthUserChange.event,
            ),
        );
        this.add(
            vscode.commands.registerCommand(CommandName.Login, this.handleCommandLogin, this),
        );
        this.add(this.onDidLoginTokenChange.event(token => {
            this.login(authClient, token);
            this.client = this.add(
                new PsClient(psProtos, cfg.printstream.address, token));
            this.onDidPsClientChange.fire(this.client);
        }));

        this.add(new PsFileSystem());

        this.fetchLocalToken();
    }

    private login(client: AuthServiceClient, token: string) {
        client.Login(
            { token },
            new grpc.Metadata(),
            async (err?: grpc.ServiceError, resp?: LoginResponse) => {
                if (err) {
                    vscode.window.showErrorMessage(`Login error: ${err.message}`);
                    return;
                } else {
                    this.onDidAuthUserChange.fire(resp?.user!);
                }
            });
    }
    
    public deactivate() {
        this.dispose();

        // Even when deactivated/disposed we need to provide view implementations
        // declared in the package.json to avoid the 'no tree view with id ...' error.
        new EmptyView(ViewName.Posts, this.disposables);
    }

    protected add<T extends vscode.Disposable>(disposable: T): T {
        this.disposables.push(disposable);
        return disposable;
    }

    private handleCommandLogin() {
        this.githubOauth?.getJwt()
            .then(jwt => {
                jwt = jwt.trim();
                this.onDidLoginTokenChange.fire(jwt);
                this.storeLocalToken(jwt);
                return jwt;
            }).catch(err => {
                vscode.window.showErrorMessage(`Login error: ${err.message}`);
            });
    }

    fetchLocalToken() {
        const token = Container.context.globalState.get<string>(MementoName.APIToken);
        if (!token) {
            return;
        }
        this.onDidLoginTokenChange.fire(token.trim());
    }

    async storeLocalToken(token: string): Promise<void> {
        return Container.context.globalState.update(MementoName.APIToken, token);
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
