import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';

import { AuthServiceClient } from './proto/build/stack/auth/v1beta1/AuthService';
import { DeviceLoginResponse } from './proto/build/stack/auth/v1beta1/DeviceLoginResponse';
import { ExtensionID } from './configurations';
import { LoginRequest } from './proto/build/stack/auth/v1beta1/LoginRequest';
import { LoginResponse } from './proto/build/stack/auth/v1beta1/LoginResponse';
import { VSCodeEnv } from './context';


export interface IAuthClient {
    readonly client: AuthServiceClient;
    login(request: LoginRequest): Promise<LoginResponse>;
    deviceLogin(apiToken?: string): Promise<DeviceLoginResponse>;
}

export class AuthGrpcClient implements vscode.Disposable {

    constructor(
        private env: VSCodeEnv,
        public client: AuthServiceClient,
    ) {
    }

    public login(request: LoginRequest): Promise<LoginResponse> {
        return new Promise((resolve, reject) => {
            this.client.Login(request, new grpc.Metadata(), (error: grpc.ServiceError | null, response: LoginResponse | undefined) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response!);
                }
            });
        });
    }

    public deviceLogin(apiToken?: string): Promise<DeviceLoginResponse> {
        return new Promise<DeviceLoginResponse>((resolve, reject) => {
            const call = this.client.DeviceLogin({
                apiToken,
                deviceName: ExtensionID,
            });

            let completed: DeviceLoginResponse | undefined;
            let didOpenOauthURL = false;

            call.on('status', (status: grpc.StatusObject) => {
                if (status.code !== grpc.status.OK) {
                    reject(status);
                    return;
                }
                if (!completed) {
                    reject(new Error('failed to capture accessToken (no details available)'));
                    return;
                }
                resolve(completed);
            });

            call.on('data', (response: DeviceLoginResponse) => {
                if (response.completed) {
                    completed = response;
                } else {
                    if (!didOpenOauthURL && response.oauthUrl) {
                        this.env.openExternal(vscode.Uri.parse(response.oauthUrl));
                        didOpenOauthURL = true;
                    }
                }
            });

            call.on('error', (err: Error) => {
                reject(err);
            });

            call.on('end', () => {
            });
        });
    }

    public dispose(): void {
        this.client.close();
    }

}
