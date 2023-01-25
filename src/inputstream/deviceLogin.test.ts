import * as vscode from 'vscode';

import { describe, it } from "@jest/globals";
import { expect } from "chai";
import { loadAuthProtos } from "./configuration";
import { DeviceLogin } from "./deviceLogin";
import { AuthClientServer } from './authServiceServer';

describe('DeviceLogin', () => {
    const proto = loadAuthProtos('proto/auth.proto');
    let globalState: vscode.Memento;
    let auths: AuthClientServer;
    let deviceLogin: DeviceLogin;

    beforeEach(async () => {
        globalState = new InMemoryMemento();
        auths = new AuthClientServer();
        const client = await auths.connect();
        deviceLogin = new DeviceLogin(globalState, client);
    });

    it('constructor', () => {
        expect(deviceLogin).to.exist;
    });

    it('throws error if no saved token exists', async () => {
        try {
            await deviceLogin.refreshAccessToken();
        } catch (e) {
            expect((e as unknown as Error).message).to.equal('refresh token is not available, have you logged in?');
        }
    });

    xit('uses saved token from memento if exists', async () => {
        await globalState.update('input.stream.api.DeviceLoginResponse', 'fake-jwt');
        await deviceLogin.refreshAccessToken();
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