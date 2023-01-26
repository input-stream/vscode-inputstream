import * as vscode from 'vscode';

import { AuthServiceClient } from './proto/build/stack/auth/v1beta1/AuthService';

export class AuthGrpcClient implements vscode.Disposable {

    constructor(
        public client: AuthServiceClient,
    ) {
    }

    public dispose(): void {
        this.client.close();
    }

}
