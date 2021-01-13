import * as luxon from 'luxon';
import * as vscode from 'vscode';
import { Timestamp } from './proto/google/protobuf/Timestamp';
import Long = require('long');
import { BuiltInCommands } from './constants';
import path = require('path');

export interface IExtensionFeature {
    // The name of the feature
    readonly name: string
    // activate is called only when the feature is enabled upon activation
    activate(context: vscode.ExtensionContext, config: vscode.WorkspaceConfiguration): Promise<any>
    // deactivate is called only when the feature is enabled upon deactivation
    deactivate(): any
}

export interface ITelemetry {
    sendTelemetryEvent(eventName: string, properties?: {
        [key: string]: string;
    }, measurements?: {
        [key: string]: number;
    }): void;
    sendTelemetryErrorEvent(eventName: string, properties?: {
        [key: string]: string;
    }, measurements?: {
        [key: string]: number;
    }): void;
    sendTelemetryException(error: Error, properties?: {
        [key: string]: string;
    }, measurements?: {
        [key: string]: number;
    }): void;
    dispose(): Promise<any>;
}

export function getRelativeDateFromTimestamp(ts: Timestamp): string {
    const dateTime = luxon.DateTime.fromSeconds(Long.fromValue(ts.seconds!).toNumber());
    let when = dateTime.toRelative();
    if (!when) {
        return 'unknown';
    }
    if (when === 'in 0 seconds') {
        when = 'just now';
    }
    return when;
}

/**
 * Returns true if the given timestamp represents a moment in the past. 
 * @param ts 
 */
export function isTimestampPast(ts: Timestamp): boolean {
    const then = luxon.DateTime.fromSeconds(Long.fromValue(ts.seconds!).toNumber());
    const now = luxon.DateTime.local();
    return then.toMillis() < now.toMillis();
}

/**
 * Format a timestamp like "2020-12-03".
 * @param ts 
 */
export function formatTimestampISODate(ts: Timestamp | undefined): string {
    if (!ts) {
        return 'UNKNOWN';
    }
    const createdAt: luxon.DateTime = luxon.DateTime.fromSeconds(
        Long.fromValue(ts.seconds!).toNumber());
    return createdAt.toISODate() || '';
}

export function setCommandContext<T>(key: string, value: T) {
	return vscode.commands.executeCommand(BuiltInCommands.SetContext, key, value);
}

export function resolveHome(filepath: string) {
    if (filepath[0] === '~') {
        return path.join(process.env.HOME!, filepath.slice(1));
    }
    return filepath;
}
