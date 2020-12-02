import * as vscode from 'vscode';

export const FeatureName = 'print.stream';

export enum ViewName {
    Posts = 'print.stream.posts',
}

export enum Help {
    Repository = 'repository',
    Package = 'package',
    Workspace = 'workspace',
}

export enum ConfigSection {
    AuthProto = 'auth.proto',
    PrintstreamProto = 'printstream.proto',
    ApiAddress = 'api.address',
    OAuthGithubRelay = 'oauth.github.relay',
    Verbose = 'verbose',
}

export enum CommandName {
    RefreshSuffix = '.refresh',
    PostCreate = 'print.stream.posts.create',
    PostOpen = 'print.stream.posts.open',
    Login = 'print.stream.login',

    PsExplorer = 'workbench.view.extension.printstream-explorer',
    OpenSetting = 'printstream.openExtensionSetting',
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
    Post = 'post',
}

export enum FileSystems {
    PsFs = 'psfs',
}

export enum MementoName {
    APIToken = 'print.stream.api.token',
}