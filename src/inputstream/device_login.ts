import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import { isTimestampPast, setCommandContext } from '../common';
import { BuiltInCommands, ExtensionID } from '../constants';
import { Container } from '../container';
import { AuthServiceClient } from '../proto/build/stack/auth/v1beta1/AuthService';
import { DeviceLoginResponse } from '../proto/build/stack/auth/v1beta1/DeviceLoginResponse';
import { LoginResponse } from '../proto/build/stack/auth/v1beta1/LoginResponse';
import { User } from '../proto/build/stack/auth/v1beta1/User';
import { CommandName, ContextName, MementoName } from './constants';

export class DeviceLogin implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];

    public onDidLoginTokenChange = new vscode.EventEmitter<string>();
    public onDidAuthUserChange = new vscode.EventEmitter<User>();

    constructor(
        private authClient: AuthServiceClient,
    ) {
        this.disposables.push(this.onDidLoginTokenChange);
        this.disposables.push(this.onDidAuthUserChange);

        this.disposables.push(vscode.commands.registerCommand(
            CommandName.DeviceLogin, this.handleCommandDeviceLogin, this));
        this.disposables.push(vscode.commands.registerCommand(
            CommandName.Login, this.handleCommandLogin, this));
    }

    private handleCommandDeviceLogin() {
        const loginUri = vscode.Uri.parse('https://input.stream/settings/extensions/stackbuild.vscode-inputstream/login');
        vscode.commands.executeCommand(BuiltInCommands.Open, loginUri);
        // this.deviceLogin();
    }

    /**
     * handleCommandLogin responds to the login command; this is typically
     * triggered by the urihandler for URIs like
     * vscode://StackBuild.vscode-inputstream/login?token=...
     * @param token 
     */
    private handleCommandLogin(token: string) {
        if (!token) {
            return;
        }
        this.login(token);
    }

    public async refreshAccessToken(): Promise<void> {
        const response = this.getSavedDeviceLoginResponse();
        if (!response) {
            throw new Error('refresh token is not available');
        }
        return this.deviceLogin(response.apiToken);
    }

    public async deviceLogin(apiToken?: string): Promise<void> {
        const stream = this.authClient.DeviceLogin({
            deviceName: ExtensionID,
            apiToken: apiToken,
        }, new grpc.Metadata());
        if (!stream) {
            vscode.window.showWarningMessage('login error: device login stream undefined');
            throw new Error('login error: device login stream undefined');
        }

        return new Promise((resolve, reject) => {
            stream.on('data', (response: DeviceLoginResponse) => {
                let didOpenOauthURL = false;
                if (!response.completed && response.oauthUrl && !didOpenOauthURL) {
                    const uri = vscode.Uri.parse(response.oauthUrl);
                    vscode.env.openExternal(uri);
                    didOpenOauthURL = true;
                    return;
                }
                if (response.completed) {
                    this.onDidAuthUserChange.fire(response.user!);
                    this.onDidLoginTokenChange.fire(response.accessToken!);
                    setCommandContext(ContextName.LoggedIn, true);
                    this.saveDeviceLoginResponse(response);
                    resolve();
                }
            });

            stream.on('error', (err: Error) => {
                setCommandContext(ContextName.LoggedIn, false);
                const errMsg = (err as grpc.ServiceError).message;
                // vscode.window.showErrorMessage('login error: ' + errMsg);
                reject(err);
            });

            stream.on('end', () => {
                console.log('device login end.');
            });
        });

    }

    public async login(token: string): Promise<void> {
        this.authClient.Login({ token }, new grpc.Metadata(), (error: grpc.ServiceError | undefined, response: LoginResponse | undefined) => {
            if (error) {
                setCommandContext(ContextName.LoggedIn, false);
                vscode.window.showErrorMessage('login error: ' + error.message);
                return;
            }
            this.onDidAuthUserChange.fire(response!.user!);
            this.onDidLoginTokenChange.fire(response!.token!);
            this.saveLoginResponse(response);
        });
    }

    private getSavedDeviceLoginResponse(): DeviceLoginResponse | undefined {
        return Container.context.globalState.get<DeviceLoginResponse>(MementoName.DeviceLoginResponse);
    }

    private getSavedLoginResponse(): LoginResponse | undefined {
        return Container.context.globalState.get<LoginResponse>(MementoName.LoginResponse);
    }

    public restoreSaved(): boolean {
        return this.restoreSavedLoginResponse();
    }

    private restoreSavedLoginResponse(): boolean {
        const response = this.getSavedLoginResponse();
        if (!response) {
            return false;
        }

        if (!response.expiresAt) {
            return false;
        }

        if (isTimestampPast(response.expiresAt)) {
            this.saveLoginResponse(undefined);
            return false;
        }

        this.fireLogin(response.user!, response.token!);

        return true;
    }

    private restoreSavedDeviceLoginResponse(): boolean {
        const response = this.getSavedDeviceLoginResponse();
        if (!response) {
            return false;
        }
        if (!response.expiresAt) {
            return false;
        }

        if (isTimestampPast(response.expiresAt)) {
            this.saveDeviceLoginResponse(undefined);
            return false;
        }

        this.fireLogin(response.user!, response.accessToken!);

        return true;
    }

    private fireLogin(user: User, token: string) {
        this.onDidAuthUserChange.fire(user);
        this.onDidLoginTokenChange.fire(token);
        setCommandContext(ContextName.LoggedIn, true);
    }

    private async saveDeviceLoginResponse(response: DeviceLoginResponse | undefined): Promise<void> {
        return Container.context.globalState.update(MementoName.DeviceLoginResponse, response);
    }

    private async saveLoginResponse(response: LoginResponse | undefined): Promise<void> {
        return Container.context.globalState.update(MementoName.LoginResponse, response);
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

