import * as vscode from 'vscode';

export const FeatureName = 'input.stream';

export enum ViewName {
    InputExplorer = 'input.stream.inputExplorer',
    FileExplorer = 'input.stream.fileExplorer',
}

export enum Help {
    Repository = 'repository',
    Package = 'package',
    Workspace = 'workspace',
}

export enum ConfigSection {
    AuthProto = 'auth.proto',
    inputstreamProto = 'inputstream.proto',
    ApiAddress = 'api.address',
    Verbose = 'verbose',
}

export enum CommandName {
    RefreshSuffix = '.refresh',
    InputCreate = 'input.stream.input.create',
    InputOpen = 'input.stream.input.open',
    InputRemove = 'input.stream.input.remove',
    Login = 'input.stream.login',

    PsExplorer = 'workbench.view.extension.inputstream-explorer',
    OpenSetting = 'input.stream.openExtensionSetting',
}

export const ThemeIconCircleOutline = new vscode.ThemeIcon('circle-outline');
export const ThemeIconCloudDownload = new vscode.ThemeIcon('cloud-download');
export const ThemeIconDebugContinue = new vscode.ThemeIcon('debug-continue');
export const ThemeIconDebugStackframe = new vscode.ThemeIcon('debug-stackframe');
export const ThemeIconDebugStackframeActive = new vscode.ThemeIcon('debug-stackframe-active');
export const ThemeIconDebugStackframeFocused = new vscode.ThemeIcon('debug-stackframe-focused');
export const ThemeIconDebugStart = new vscode.ThemeIcon('debug-start');
export const ThemeIconQuestion = new vscode.ThemeIcon('question');
export const ThemeIconReport = new vscode.ThemeIcon('report');
export const ThemeIconFile = new vscode.ThemeIcon('file');
export const ThemeIconServer = new vscode.ThemeIcon('server');
export const ThemeIconSymbolEvent = new vscode.ThemeIcon('symbol-event');
export const ThemeIconSymbolInterface = new vscode.ThemeIcon('symbol-interface');
export const ThemeIconVerified = new vscode.ThemeIcon('verified');

export enum ContextValue {
    Input = 'input',
}

export enum FileSystems {
    PsFs = 'psfs',
}

export enum MementoName {
    DeviceLoginResponse = 'input.stream.api.login',
}

export enum ButtonName {
    Confirm = 'Confirm',
    Cancel = 'Cancel',
}