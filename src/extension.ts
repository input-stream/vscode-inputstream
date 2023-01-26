import * as vscode from 'vscode';

import { AccountExplorer } from './accountExplorer';
import { API } from './api';
import { loadAuthProtos, loadByteStreamProtos, loadInputStreamProtos, createAuthServiceClient } from './clients';
import { CommandName, openExtensionSetting } from './commands';
import { ConfigName, createInputStreamConfiguration } from './configurations';
import { Context } from './context';
import { makeChannelCredentials } from './authenticatingGrpcClient';
import { ImageSearch } from './imagesearch/imagesearch';
import { InputsExplorer } from './inputsExplorer';
import { LoginController } from './loginController';
import { User } from './proto/build/stack/auth/v1beta1/User';
import { StreamFsController } from './streamfs/streamFscontroller';
import { UriHandler } from './uriHandler';
import { ByteStreamGrpcClient } from './byteStreamClient';
import { ImagesGrpcClient } from './imagesClient';
import { InputsGrpcClient } from './inputsClient';
import { AuthClient } from 'google-auth-library/build/src/auth/authclient';
import { AuthGrpcClient } from './authClient';

const api = new API();

export function activate(extensionCtx: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration(ConfigName);

	const ctx: Context = {
		add<T extends vscode.Disposable>(d: T): T {
			extensionCtx.subscriptions.push(d);
			return d;
		},
		extensionUri: extensionCtx.extensionUri,
	};

	ctx.add(vscode.commands.registerCommand(CommandName.OpenSetting, openExtensionSetting));

	const cfg = createInputStreamConfiguration(extensionCtx.asAbsolutePath.bind(extensionCtx), config);
	const authProtos = loadAuthProtos(cfg.auth.protofile);
	const byteStreamProtos = loadByteStreamProtos(cfg.bytestream.protofile);
	const inputStreamProtos = loadInputStreamProtos(cfg.inputstream.protofile);

	const auth = ctx.add(new AuthGrpcClient(createAuthServiceClient(authProtos, cfg.auth.address)));

	const loginController = new LoginController(
		ctx,
		vscode.commands,
		vscode.env,
		vscode.window,
		extensionCtx.globalState,
		auth.client,
	);

	const bytestreamClient = ctx.add(
		new ByteStreamGrpcClient(
			new byteStreamProtos.google.bytestream.ByteStream(
				cfg.bytestream.address,
				makeChannelCredentials(cfg.bytestream.address)
			),
			loginController,
		)
	);

	const inputsClient = ctx.add(
		new InputsGrpcClient(
			new inputStreamProtos.build.stack.inputstream.v1beta1.Inputs(
				cfg.inputstream.address,
				makeChannelCredentials(cfg.inputstream.address)
			),
			loginController,
		)
	);

	const imageSearchClient = ctx.add(
		new ImagesGrpcClient(
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

