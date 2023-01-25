import * as vscode from 'vscode';

import { describe, it } from "@jest/globals";
import { expect } from "chai";
import { loadAuthProtos } from "./configuration";
import { AuthServiceClient } from '../proto/build/stack/auth/v1beta1/AuthService';
import { DeviceLogin } from "./deviceLogin";
import { createAuthServiceClient } from "../inputstream/configuration";

describe('DeviceLogin', () => {
    const proto = loadAuthProtos('proto/auth.proto');
    let client: AuthServiceClient;
    let globalState: vscode.Memento;

    beforeEach(() => {
        client = createAuthServiceClient(proto, '0.0.0.0:0');
        globalState = new InMemoryMemento();
    });

    it('constructor', () => {
        const dl = new DeviceLogin(globalState, client);
        expect(dl).to.exist;
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