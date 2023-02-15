import * as vscode from 'vscode';

import { BuiltInCommandName, CommandName, ContextName } from './commands';
import { Context, VSCodeCommands, VSCodeEnv, VSCodeWindow } from './context';
import { MementoName } from './configurations';
import { User } from './proto/build/stack/auth/v1beta1/User';
import { IAuthClient } from './authClient';


/**
 * AuthController handles save/restore of users and their access tokens.
 */
export class AuthController {

    public onDidAuthUserChange = new vscode.EventEmitter<User | undefined>();

    constructor(
        ctx: Context,
        private commands: VSCodeCommands,
        private window: VSCodeWindow,
        private globalState: vscode.Memento,
        private client: IAuthClient,
    ) {
        ctx.add(this.onDidAuthUserChange);

        ctx.add(commands.registerCommand(
            CommandName.Login, this.handleCommandLogin, this));
        ctx.add(commands.registerCommand(
            CommandName.Logout, this.handleCommandLogout, this));
        ctx.add(commands.registerCommand(
            CommandName.JwtLogin, this.handleCommandJwtLogin, this));
    }

    // ===================== PUBLIC =====================

    public getAccessToken(): string | undefined {
        return this.restoreAccessToken();
    }

    public async refreshAccessToken(): Promise<string> {
        const apiToken = this.restoreApiToken();
        const response = await this.client.deviceLogin(apiToken);
        if (response.accessToken && response.user) {
            await this.login(response.accessToken!, response.user!);
            return response.accessToken!;
        } else {
            throw new Error(`device login failed (accessToken or user was not included in response)`);
        }
    }

    public async restoreLogin(): Promise<boolean> {
        const accessToken = this.restoreAccessToken();
        if (!accessToken) {
            return false;
        }
        const user = this.restoreUser();
        if (!user) {
            return false;
        }
        this.login(accessToken, user);
        return true;
    }

    // ===================== PRIVATE =====================

    private async login(accessToken: string, user: User): Promise<void> {
        await this.saveAccessToken(accessToken!);
        await this.saveUser(user);
        await this.setContext(ContextName.LoggedIn, true);

        this.onDidAuthUserChange.fire(user);
    }

    private async logout(): Promise<void> {
        await this.clearApiToken();
        await this.clearAccessToken();
        await this.clearUser();
        await this.setContext(ContextName.LoggedIn, false);
        this.onDidAuthUserChange.fire(undefined);
    }

    // ===================== command handlers =====================

    /**
     * handleCommandWebLogin responds to the login endpoint; this is typically
     * triggered by the urihandler for URIs like
     * vscode://StackBuild.vscode-inputstream/login?token=...
     * @param jwt 
     */
    private async handleCommandJwtLogin(jwt: string) {
        if (!jwt) {
            return;
        }
        try {
            const response = await this.client.login({ token: jwt });
            await this.saveApiToken(jwt);
            this.login(response.token!, response.user!);
        } catch (e) {
            if (e instanceof Error) {
                this.window.showErrorMessage(`Login error: ${e.message}`);
            }
        }
    }

    private async handleCommandLogin(): Promise<string> {
        await this.clearAccessToken();
        await this.clearUser();
        return this.refreshAccessToken();
    }

    private handleCommandLogout(): Promise<void> {
        return this.logout();
    }

    // ===================== state functions =====================

    private async saveUser(user: User | undefined): Promise<void> {
        return this.globalState.update(MementoName.User, user);
    }

    private restoreUser(): User | undefined {
        return this.globalState.get<User>(MementoName.User);
    }

    private async clearUser(): Promise<void> {
        return this.globalState.update(MementoName.User, undefined);
    }

    private async saveAccessToken(accessToken: string): Promise<void> {
        return this.globalState.update(MementoName.AccessToken, accessToken);
    }

    private restoreAccessToken(): string | undefined {
        return this.globalState.get<string>(MementoName.AccessToken);
    }

    private async clearAccessToken(): Promise<void> {
        return this.globalState.update(MementoName.AccessToken, undefined);
    }

    private async saveApiToken(apiToken: string): Promise<void> {
        return this.globalState.update(MementoName.ApiToken, apiToken);
    }

    private restoreApiToken(): string | undefined {
        return this.globalState.get<string>(MementoName.ApiToken);
    }

    private async clearApiToken(): Promise<void> {
        return this.globalState.update(MementoName.ApiToken, undefined);
    }

    // ===================== misc =====================

    private setContext<T>(key: string, value: T): Thenable<void> {
        return this.commands.executeCommand(BuiltInCommandName.SetContext, key, value);
    }

}

