import * as vscode from 'vscode';

import { AccountExplorer } from './accountExplorer';
import { API } from './api';
import { ByteStreamGRPCClient } from './byteStreamClient';
import { loadAuthProtos, loadByteStreamProtos, loadInputStreamProtos, createAuthServiceClient } from './clients';
import { CommandName, openExtensionSetting } from './commands';
import { ConfigName, createInputStreamConfiguration } from './configurations';
import { Context } from './context';
import { makeChannelCredentials } from './grpcclient';
import { ImageSearch } from './imagesearch/imagesearch';
import { ImageSearchClient } from './imageSearchClient';
import { InputsExplorer } from './inputsExplorer';
import { InputsGRPCClient } from './inputStreamClient';
import { LoginController } from './loginController';
import { User } from './proto/build/stack/auth/v1beta1/User';
import { StreamFsController } from './streamfs/streamFscontroller';
import { UriHandler } from './uriHandler';

const api = new API();

export function activate(extensionCtx: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration(ConfigName);

	const cfg = createInputStreamConfiguration(extensionCtx.asAbsolutePath.bind(extensionCtx), config);
	const authProtos = loadAuthProtos(cfg.auth.protofile);
	const byteStreamProtos = loadByteStreamProtos(cfg.bytestream.protofile);
	const inputStreamProtos = loadInputStreamProtos(cfg.inputstream.protofile);

	const authClient = createAuthServiceClient(authProtos, cfg.auth.address);

	const ctx: Context = {
		add<T extends vscode.Disposable>(d: T): T {
			extensionCtx.subscriptions.push(d);
			return d;
		},
		extensionUri: extensionCtx.extensionUri,
	}

	ctx.add(vscode.commands.registerCommand(CommandName.OpenSetting, openExtensionSetting));

	const loginController = new LoginController(
		ctx,
		vscode.commands,
		vscode.env,
		vscode.window,
		extensionCtx.globalState,
		authClient,
	);

	const bytestreamClient = ctx.add(
		new ByteStreamGRPCClient(
			new byteStreamProtos.google.bytestream.ByteStream(
				cfg.bytestream.address,
				makeChannelCredentials(cfg.bytestream.address)
			),
			loginController,
		)
	);

	const inputsClient = ctx.add(
		new InputsGRPCClient(
			new inputStreamProtos.build.stack.inputstream.v1beta1.Inputs(
				cfg.inputstream.address,
				makeChannelCredentials(cfg.inputstream.address)
			),
			loginController,
		)
	);

	const imageSearchClient = ctx.add(
		new ImageSearchClient(
			new inputStreamProtos.build.stack.inputstream.v1beta1.Images(
				cfg.inputstream.address,
				makeChannelCredentials(cfg.inputstream.address)
			),
			loginController,
		)
	);

	new ImageSearch(ctx, vscode.commands, vscode.window, imageSearchClient);
	new UriHandler(ctx, vscode.window, vscode.commands);

	const accountsExplorer = new AccountExplorer(ctx, vscode.window, vscode.commands);
	const inputsExplorer = new InputsExplorer(ctx, vscode.window, vscode.commands, inputsClient);

	ctx.add(loginController.onDidAuthUserChange.event((user: User) => {
		accountsExplorer.handleAuthUserChange(user);
		inputsExplorer.handleUserLogin(user);
	}));

	ctx.add(loginController.onDidLoginTokenChange.event(token => {
		bytestreamClient.setToken(token);
		imageSearchClient.setToken(token);
		inputsClient.setToken(token);
	}));

	new StreamFsController(ctx, vscode.commands, vscode.workspace, inputsClient, bytestreamClient);

	loginController.restore();

	return api;
}

export function deactivate() {
}

