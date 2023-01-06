import * as vscode from 'vscode';
import { API } from './api';
import { IExtensionFeature } from './common';
import { BuiltInCommands, Telemetry } from './constants';
import { Container } from './container';
import { CommandName } from './inputstream/constants';
import { InputStreamFeature } from './inputstream/feature';

const api = new API();

const features: IExtensionFeature[] = [
	new InputStreamFeature(),
];

export function activate(ctx: vscode.ExtensionContext) {
	Container.initialize(ctx);

	ctx.subscriptions.push(
		vscode.commands.registerCommand(
			CommandName.OpenSetting,
			openExtensionSetting));

	Container.telemetry.sendTelemetryEvent(Telemetry.ExtensionActivate);

	features.forEach(feature => setup(ctx, feature));

	return api;
}

export function deactivate() {
	features.forEach(feature => feature.deactivate());
	Container.telemetry.sendTelemetryEvent(Telemetry.ExtensionDeactivate);
	Container.dispose();
}

function setup(context: vscode.ExtensionContext, feature: IExtensionFeature) {
	const config = vscode.workspace.getConfiguration(feature.name);
	if (!config.get<boolean>('enabled')) {
		console.log(`skipping feature ${feature.name} (not enabled)`);
		return;
	}
	feature.activate(context, config).then(() => {
		Container.telemetry.sendTelemetryEvent(Telemetry.FeatureActivate, {
			'feature': feature.name,
		});
	}).catch(err => {
		vscode.window.showErrorMessage(
			`could not activate feature "${feature.name}": ${err}`,
		);
	});
}

/**
 * Options for the OpenSetting command
 */
type OpenSettingCommandOptions = {
	// The query string
	q: string,
};

async function openExtensionSetting(options: OpenSettingCommandOptions): Promise<any> {
	return vscode.commands.executeCommand(BuiltInCommands.OpenSettings, options?.q);
}

