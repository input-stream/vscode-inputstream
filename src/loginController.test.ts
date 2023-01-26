import * as vscode from 'vscode';

import { describe, it } from "@jest/globals";
import { expect } from "chai";
import { loadAuthProtos } from "./configuration";
import { DeviceLogin, VSCodeCommands, VSCodeEnv, VSCodeWindow } from "./deviceLogin";
import { AuthClientServer } from './authServiceServer';
import { User } from '../proto/build/stack/auth/v1beta1/User';
import { DeviceLoginResponse } from '../proto/build/stack/auth/v1beta1/DeviceLoginResponse';
import { newTimestamp } from './timestamp';

describe('DeviceLogin', () => {
    const proto = loadAuthProtos('proto/auth.proto');
    let globalState: vscode.Memento;
    let auths: AuthClientServer;
    let deviceLogin: DeviceLogin;
    let vsc: VSCodeEnv & VSCodeCommands & VSCodeWindow;
    let openExternal: jest.Mock<Promise<boolean>, any>;
    let registerCommand: jest.Mock<vscode.Disposable, any>;
    let showErrorMessage: jest.Mock<Promise<any>, any>;

    beforeEach(async () => {
        registerCommand = jest.fn();
        openExternal = jest.fn();
        showErrorMessage = jest.fn();
        vsc = {
            openExternal,
            registerCommand,
            showErrorMessage,
            executeCommand: jest.fn(),

        };
        globalState = new InMemoryMemento();
        auths = new AuthClientServer();
        const client = await auths.connect();
        deviceLogin = new DeviceLogin(vsc, vsc, vsc, globalState, client);
    });

    it('constructor', () => {
        expect(deviceLogin).to.exist;
        expect(registerCommand.mock.calls[0][0]).to.equal("input.stream.login");
        expect(registerCommand.mock.calls[1][0]).to.equal("input.stream.loginToken");
    });

    it('refreshAccessToken throws error if no saved token exists', async () => {
        try {
            await deviceLogin.refreshAccessToken();
        } catch (e) {
            expect((e as unknown as Error).message).to.equal('refresh token is not available, please login');
        }
    });

    it('refreshAccessToken uses saved token from memento if exists', async () => {
        //
        // Given
        // 
        let loginToken: string | undefined;
        deviceLogin.onDidLoginTokenChange.event((token: string) => {
            loginToken = token;
        });
        let loginUser: User | undefined;
        deviceLogin.onDidAuthUserChange.event((user: User) => {
            loginUser = user;
        });
        auths.service.users.set('foo-jwt', { login: 'foo' });

        const savedResponse: DeviceLoginResponse = {
            apiToken: 'foo-jwt',
        };
        await globalState.update(
            'input.stream.api.DeviceLoginResponse',
            savedResponse,
        );

        // 
        // When
        //
        await deviceLogin.refreshAccessToken();

        //
        // Then
        //
        expect(openExternal.mock.calls).to.have.length(1);
        const urlToOpen = openExternal.mock.calls[0][0] as vscode.Uri;
        expect(urlToOpen.toString()).to.equal('https://input.stream/github_login');

        expect(loginToken).to.equal('<accessToken!>');
        expect(loginUser).to.deep.equal({ login: 'foo' });
    });

    describe('restoreLogin', () => {
        it('should return false if no previously stored data is present', async () => {
            const didRestore = await deviceLogin.restoreLogin();

            expect(didRestore).to.be.false;
        });
        it('should return false if the previously stored data has expired', async () => {
            const savedResponse: DeviceLoginResponse = {
                expiresAt: newTimestamp(-60), // one minute ago
            };
            await globalState.update('input.stream.api.DeviceLoginResponse', savedResponse);

            const didRestore = await deviceLogin.restoreLogin();

            expect(didRestore).to.be.false;
            expect(globalState.get('input.stream.api.DeviceLoginResponse')).to.be.undefined;
        });
        it('should return true if the previously stored data has not expired', async () => {
            const savedResponse: DeviceLoginResponse = {
                expiresAt: newTimestamp(+60), // in one minute
            };

            await globalState.update('input.stream.api.DeviceLoginResponse', savedResponse);
            const didRestore = await deviceLogin.restoreLogin();

            expect(didRestore).to.be.true;
        });
    });

});


/**
 * A memento represents a storage utility. It can store and retrieve
 * values.
 */
class InMemoryMemento implements vscode.Memento {
    private _data: Map<string, any> = new Map();

    /**
     * Returns the stored keys.
     *
     * @return The stored keys.
     */
    keys(): readonly string[] {
        return Array.from(this._data.keys());
    }

    /**
     * Return a value.
     *
     * @param key A string.
     * @return The stored value or `undefined`.
     */
    get<T>(key: string, defaultValue?: T): T | undefined {
        return this._data.get(key) || defaultValue;
    }

    /**
     * Store a value. The value must be JSON-stringifyable.
     *
     * *Note* that using `undefined` as value removes the key from the underlying
     * storage.
     *
     * @param key A string.
     * @param value A value. MUST not contain cyclic references.
     */
    async update(key: string, value: any): Promise<void> {
        if (typeof value === 'undefined') {
            this._data.delete(key);
        } else {
            this._data.set(key, value);
        }
    }
}