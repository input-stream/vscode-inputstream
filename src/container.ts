import * as vscode from 'vscode';
import TelemetryReporter from 'vscode-extension-telemetry';
import { ITelemetry } from './common';
import { AIKey, ExtensionID, Telemetry } from './constants';
import path = require('path');
import protobuf = require('protobufjs');

export class Container {
    private static _context: vscode.ExtensionContext;
    private static _telemetry: TelemetryReporter;

    public static buildEventType: Promise<protobuf.Type>;
    public static debugEventType: Promise<protobuf.Type>;
    public static debugRequestType: Promise<protobuf.Type>;
    
    static initialize(context: vscode.ExtensionContext) {
        Container._context = context;
        this.initializeTelemetry(context);
    }

    private static initializeTelemetry(context: vscode.ExtensionContext) {
        const packageJSON = vscode.extensions.getExtension(ExtensionID)?.packageJSON;
        const version = packageJSON.version;

        Container._telemetry = new TelemetryReporter(ExtensionID, version, AIKey);
        context.subscriptions.push(Container._telemetry);

        Container.telemetry.sendTelemetryEvent(Telemetry.ExtensionActivate);
    }

    public static get context(): vscode.ExtensionContext {
        return Container._context;
    }

    static get telemetry(): ITelemetry {
        return Container._telemetry;
    }

    static mediaIconPath(name: MediaIconName): string {
        return path.join(Container._context.extensionPath, 'media', name);
    }

    static dispose() {
        Container._telemetry.dispose();
    }
}

export enum MediaIconName {
    Astronaut = 'astronaut.svg',
}
