import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';

import { CommandName, setCommandContext, ContextName, BuiltInCommandName } from './commands';
import { ExtensionID, MementoName } from './configurations';
import { Context, VSCodeCommands, VSCodeEnv, VSCodeWindow } from './context';
import { isTimestampPast } from './dates';
import { AuthServiceClient } from './proto/build/stack/auth/v1beta1/AuthService';
import { DeviceLoginResponse } from './proto/build/stack/auth/v1beta1/DeviceLoginResponse';
import { LoginRequest } from './proto/build/stack/auth/v1beta1/LoginRequest';
import { LoginResponse } from './proto/build/stack/auth/v1beta1/LoginResponse';
import { User } from './proto/build/stack/auth/v1beta1/User';
import { loginUri } from './uris';

export interface AccessTokenRefresher {
    refreshAccessToken(): Promise<void>;
}

export class LoginController implements AccessTokenRefresher {

    public onDidLoginTokenChange = new vscode.EventEmitter<string>();
    public onDidAuthUserChange = new vscode.EventEmitter<User>();

    constructor(
        ctx: Context,
        private commands: VSCodeCommands,
        private env: VSCodeEnv,
        private window: VSCodeWindow,
        private globalState: vscode.Memento,
        private authClient: AuthServiceClient,
    ) {
        ctx.add(this.onDidLoginTokenChange);
        ctx.add(this.onDidAuthUserChange);

        ctx.add(commands.registerCommand(
            CommandName.Login, this.handleCommandDeviceLogin, this));
        ctx.add(commands.registerCommand(
            CommandName.LoginToken, this.handleCommandLoginToken, this));
    }

    // ===================== PUBLIC =====================

    public async login(token: string): Promise<void> {
        try {
            const response = await this.callLogin({ token });
            this.onDidAuthUserChange.fire(response!.user!);
            this.onDidLoginTokenChange.fire(response!.token!);
            this.saveLoginResponse(response);
        } catch (e) {
            const error = e as unknown as Error;
            this.commands.executeCommand(BuiltInCommandName.SetContext, ContextName.LoggedIn, false);
            this.window.showErrorMessage('login error: ' + error.message);
        }
    }

    public async restore(): Promise<boolean> {
        const response = this.getSavedLoginResponse();
        if (!response) {
            return false;
        }

        if (!response.expiresAt) {
            return false;
        }

        if (isTimestampPast(response.expiresAt)) {
            await this.saveLoginResponse(undefined);
            return false;
        }

        this.fireLogin(response.user!, response.token!);

        return true;
    }

    public async refreshAccessToken(): Promise<void> {
        const response = this.getSavedDeviceLoginResponse();
        if (!response) {
            // TODO: execute login command here?
            throw new Error('refresh token is not available, please login');
        }
        return this.deviceLogin(response.apiToken);
    }

    public async deviceLogin(apiToken?: string): Promise<void> {
        const call = this.authClient.DeviceLogin({
            deviceName: ExtensionID,
            apiToken: apiToken,
        }, new grpc.Metadata());

        return new Promise((resolve, reject) => {
            call.on('status', (status: grpc.StatusObject) => {
                if (status.code === grpc.status.OK) {
                    resolve();
                } else {
                    reject(status);
                }
            });
            call.on('data', (response: DeviceLoginResponse) => {
                let didOpenOauthURL = false;
                if (!response.completed && response.oauthUrl && !didOpenOauthURL) {
                    const uri = vscode.Uri.parse(response.oauthUrl);
                    this.env.openExternal(uri);
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

            call.on('error', (err: Error) => {
                setCommandContext(ContextName.LoggedIn, false);
                reject(err);
            });

            call.on('end', () => {
            });
        });

    }

    // ===================== PRIVATE =====================

    private handleCommandDeviceLogin() {
        this.commands.executeCommand(BuiltInCommandName.Open, loginUri);
        // this.deviceLogin();
    }

    /**
     * handleCommandLogin responds to the login command; this is typically
     * triggered by the urihandler for URIs like
     * vscode://StackBuild.vscode-inputstream/login?token=...
     * @param token 
     */
    private handleCommandLoginToken(token: string) {
        if (!token) {
            return;
        }
        this.login(token);
    }

    private callLogin(request: LoginRequest): Promise<LoginResponse> {
        return new Promise((resolve, reject) => {
            this.authClient.Login(request, new grpc.Metadata(), (error: grpc.ServiceError | null, response: LoginResponse | undefined) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response!);
                }
            });
        });
    }

    private getSavedDeviceLoginResponse(): DeviceLoginResponse | undefined {
        return this.globalState.get<DeviceLoginResponse>(MementoName.DeviceLoginResponse);
    }

    private getSavedLoginResponse(): LoginResponse | undefined {
        return this.globalState.get<LoginResponse>(MementoName.LoginResponse);
    }

    private fireLogin(user: User, token: string) {
        this.onDidAuthUserChange.fire(user);
        this.onDidLoginTokenChange.fire(token);
        setCommandContext(ContextName.LoggedIn, true);
    }

    private async saveDeviceLoginResponse(response: DeviceLoginResponse | undefined): Promise<void> {
        return this.globalState.update(MementoName.DeviceLoginResponse, response);
    }

    private async saveLoginResponse(response: LoginResponse | undefined): Promise<void> {
        return this.globalState.update(MementoName.LoginResponse, response);
    }

}

