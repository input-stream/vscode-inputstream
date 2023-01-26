import * as vscode from 'vscode';

import { AccountExplorer } from './accountExplorer';
import { API } from './api';
import { loadAuthProtos, loadByteStreamProtos, loadInputStreamProtos, createAuthServiceClient, createInputsClient, ClientContext, createBytestreamClient, createImagesClient } from './clients';
import { CommandName, openExtensionSetting } from './commands';
import { ConfigName, createInputStreamConfiguration } from './configurations';
import { Context } from './context';
import { ImageSearch } from './imagesearch/imagesearch';
import { InputsExplorer } from './inputsExplorer';
import { LoginController } from './loginController';
import { User } from './proto/build/stack/auth/v1beta1/User';
import { StreamFsController } from './streamfs/streamFscontroller';
import { UriHandler } from './uriHandler';
import { ByteStreamGrpcClient } from './byteStreamClient';
import { ImagesGrpcClient } from './imagesClient';
import { InputsGrpcClient } from './inputsClient';
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

	const clientCtx: ClientContext = {
		token: () => loginController.getAccessToken(),
		refreshToken: () => loginController.refreshAccessToken(),
	};

	const byteStreamClient = createBytestreamClient(byteStreamProtos, cfg.bytestream.address, clientCtx);
	const inputsClient = createInputsClient(inputStreamProtos, cfg.inputstream.address, clientCtx);
	const imagesClient = createImagesClient(inputStreamProtos, cfg.inputstream.address, clientCtx);

	const bytestreamGrpcClient = ctx.add(new ByteStreamGrpcClient(byteStreamClient));
	const inputsGrpcClient = ctx.add(new InputsGrpcClient(inputsClient));
	const imagesGrpcClient = ctx.add(new ImagesGrpcClient(imagesClient));

	new ImageSearch(ctx, vscode.commands, vscode.window, imagesGrpcClient);
	new UriHandler(ctx, vscode.window, vscode.commands);

	const accountsExplorer = new AccountExplorer(ctx, vscode.window, vscode.commands);
	const inputsExplorer = new InputsExplorer(ctx, vscode.window, vscode.commands, inputsGrpcClient);

	const filesystem = new StreamFsController(
		ctx,
		vscode.commands,
		vscode.workspace,
		vscode.window,
		inputsGrpcClient,
		bytestreamGrpcClient,
	);

	ctx.add(loginController.onDidAuthUserChange.event((user: User) => {
		accountsExplorer.handleAuthUserChange(user);
		inputsExplorer.handleUserLogin(user);
		filesystem.handleUserLogin(user);
	}));

	loginController.restore();

	return api;
}

export function deactivate() {
}

