import * as vscode from 'vscode';

import { ProfileExplorer } from './profileExplorer';
import { API } from './api';
import { AuthGrpcClient } from './authClient';
import { ByteStreamGrpcClient } from './byteStreamClient';
import { CommandName } from './commands';
import { ConfigName, createInputStreamConfiguration } from './configurations';
import { Context } from './context';
import { createAuthServiceClient, createInputsClient, createBytestreamClient, createImagesClient } from './clients';
import { ImageSearch } from './imagesearch/imagesearch';
import { ImagesGrpcClient } from './imagesClient';
import { InputsExplorer } from './inputsExplorer';
import { InputsGrpcClient } from './inputsClient';
import { ClientContext, loadProtoPackage } from './grpc';
import { AuthController } from './authController';
import { ProtoGrpcType as AuthProtoType } from './proto/auth';
import { ProtoGrpcType as ByteStreamProtoType } from './proto/bytestream';
import { ProtoGrpcType as InputStreamProtoType } from './proto/inputstream';
import { StreamFsController } from './streamfs/streamFsController';
import { UriHandler } from './uriHandler';
import { User } from './proto/build/stack/auth/v1beta1/User';

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

	const cfg = createInputStreamConfiguration(extensionCtx.asAbsolutePath.bind(extensionCtx), config);

	const authProtos = loadProtoPackage<AuthProtoType>(cfg.auth.protofile);
	const byteStreamProtos = loadProtoPackage<ByteStreamProtoType>(cfg.bytestream.protofile);
	const inputStreamProtos = loadProtoPackage<InputStreamProtoType>(cfg.inputstream.protofile);

	const authGrpcClient = ctx.add(
		new AuthGrpcClient(
			vscode.env,
			createAuthServiceClient(authProtos, cfg.auth.address)
		));

	const authController = new AuthController(
		ctx,
		vscode.commands,
		vscode.window,
		extensionCtx.globalState,
		authGrpcClient,
	);

	const clientCtx: ClientContext = {
		accessToken: () => authController.getAccessToken(),
		refreshAccessToken: () => authController.refreshAccessToken(),
	};

	const byteStreamClient = createBytestreamClient(byteStreamProtos, cfg.bytestream.address, clientCtx);
	const inputsClient = createInputsClient(inputStreamProtos, cfg.inputstream.address, clientCtx);
	const imagesClient = createImagesClient(inputStreamProtos, cfg.inputstream.address, clientCtx);

	const bytestreamGrpcClient = ctx.add(new ByteStreamGrpcClient(byteStreamClient, clientCtx));
	const inputsGrpcClient = ctx.add(new InputsGrpcClient(inputsClient));
	const imagesGrpcClient = ctx.add(new ImagesGrpcClient(imagesClient));

	new ImageSearch(ctx, vscode.commands, vscode.window, imagesGrpcClient);
	new UriHandler(ctx, vscode.window, vscode.commands);

	const profileExplorer = new ProfileExplorer(ctx, vscode.window, vscode.commands);
	const inputsExplorer = new InputsExplorer(ctx, vscode.window, vscode.commands, inputsGrpcClient);
	const filesystem = new StreamFsController(
		ctx,
		vscode.commands,
		vscode.workspace,
		vscode.window,
		inputsGrpcClient,
		bytestreamGrpcClient,
	);

	ctx.add(authController.onDidAuthUserChange.event((user: User | undefined) => {
		if (user) {
			profileExplorer.handleUserLogin(user);
			inputsExplorer.handleUserLogin(user);
			filesystem.handleUserLogin(user);
		} else {
			profileExplorer.handleUserLogout();
			inputsExplorer.handleUserLogout();
			filesystem.handleUserLogout();
		}
	}));

	authController.restoreLogin();

	return api;
}

export function deactivate() {
}

