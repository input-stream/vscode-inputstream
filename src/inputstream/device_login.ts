import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import { isTimestampPast, setCommandContext } from '../common';
import { ExtensionID } from '../constants';
import { Container } from '../container';
import { AuthServiceClient } from '../proto/build/stack/auth/v1beta1/AuthService';
import { DeviceLoginResponse } from '../proto/build/stack/auth/v1beta1/DeviceLoginResponse';
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
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.Login, this.handleCommandLogin, this));
    }

    private handleCommandLogin() {
        this.login();
    }

    public async refreshAccessToken(): Promise<void> {
        const response = this.getSavedDeviceLoginResponse();
        if (!response) {
            throw new Error('refresh token is not available');
        }
        return this.login(response.refreshToken);
    }

    private async login(refreshToken?: string): Promise<void> {
        const stream = this.authClient.DeviceLogin({
            deviceName: ExtensionID,
            refreshToken: refreshToken,
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
                    this.save(response);
                    resolve();
                }
            });
    
            stream.on('error', (err: Error) => {
                setCommandContext(ContextName.LoggedIn, false);
                const errMsg = (err as grpc.ServiceError).message;
                vscode.window.showErrorMessage('login error: ' + errMsg);
                reject(err);
            });
    
            stream.on('end', () => {
                console.log('device login end.');
            });    
        });

    }

    private getSavedDeviceLoginResponse(): DeviceLoginResponse | undefined {
        return Container.context.globalState.get<DeviceLoginResponse>(MementoName.DeviceLoginResponse);
    }

    public restoreSaved() {
        const response = this.getSavedDeviceLoginResponse();
        if (!response) {
            return;
        }
        if (!response.expiresAt) {
            return;
        }

        if (isTimestampPast(response.expiresAt)) {
            this.save(undefined);
            return;
        }

        this.onDidLoginTokenChange.fire(response.accessToken!);
        this.onDidAuthUserChange.fire(response.user!);
        setCommandContext(ContextName.LoggedIn, true);
    }

    private async save(response: DeviceLoginResponse | undefined): Promise<void> {
        return Container.context.globalState.update(MementoName.DeviceLoginResponse, response);
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

