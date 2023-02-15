import * as vscode from 'vscode';

import { ProtoGrpcType as AuthProtoType } from './proto/auth';
import { AuthServer } from './authServer';
import { Context } from './context';
import { describe, it } from "@jest/globals";
import { DeviceLoginResponse } from './proto/build/stack/auth/v1beta1/DeviceLoginResponse';
import { expect } from "chai";
import { AuthController } from './authController';
import { newTimestamp } from './dates';
import { User } from './proto/build/stack/auth/v1beta1/User';
import { VSCodeEnv, VSCodeCommands, VSCodeWindow } from './context';
import { loadProtoPackage } from './grpc';
import { AuthGrpcClient } from './authClient';


describe('AuthController', () => {
    const proto = loadProtoPackage<AuthProtoType>('proto/auth.proto');
    let globalState: vscode.Memento;
    let auths: AuthServer;
    let controller: AuthController;
    let ctx: Context;
    let env: VSCodeEnv;
    let commands: VSCodeCommands;
    let window: VSCodeWindow;
    let openExternal: jest.Mock<Promise<boolean>, any>;
    let registerCommand: jest.Mock<vscode.Disposable, any>;
    let showErrorMessage: jest.Mock<Promise<any>, any>;

    beforeEach(async () => {
        registerCommand = jest.fn();
        openExternal = jest.fn();
        showErrorMessage = jest.fn();

        env = {
            openExternal,
            clipboard: {
                readText: jest.fn(),
                writeText: jest.fn(),
            },
        };
        commands = {
            registerCommand,
            executeCommand: jest.fn(),
        };
        window = {
            showErrorMessage,
            activeTextEditor: jest.fn() as unknown as vscode.TextEditor,
            setStatusBarMessage: jest.fn(),
            showWarningMessage: jest.fn(),
            showInformationMessage: jest.fn(),
            registerUriHandler: jest.fn(),
            registerFileDecorationProvider: jest.fn(),
            createTreeView: jest.fn(),
            createWebviewPanel: jest.fn(),
        };

        globalState = new InMemoryMemento();

        ctx = {
            add: jest.fn(),
            extensionUri: vscode.Uri.file('.'),
        };

        auths = new AuthServer();
        const client = await auths.connect();
        const authGrpcClient = new AuthGrpcClient(env, client);
        controller = new AuthController(ctx, commands, window, globalState, authGrpcClient);
    });

    it('constructor', () => {
        expect(controller).to.exist;
        expect(registerCommand.mock.calls[0][0]).to.equal("input.stream.login");
        expect(registerCommand.mock.calls[1][0]).to.equal("input.stream.logout");
    });

    describe('restore', () => {
        it('should return false if no previously stored token or user is present', async () => {
            const didRestore = await controller.restoreLogin();
            expect(didRestore).to.be.false;
        });
        it('should return false if no previously stored token is present', async () => {
            await globalState.update('input.stream.accessToken', 'abc123');
            const didRestore = await controller.restoreLogin();
            expect(didRestore).to.be.false;
        });
        it('should return true if the previously stored data exists', async () => {
            const user: User = { login: 'pcj' };
            await globalState.update('input.stream.accessToken', 'abc123');
            await globalState.update('input.stream.user', user);
            const didRestore = await controller.restoreLogin();
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
