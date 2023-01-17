import * as vscode from 'vscode';
import { Input } from '../proto/build/stack/inputstream/v1beta1/Input';

export const FeatureName = 'input.stream';

export enum ViewName {
    InputExplorer = 'input.stream.inputExplorer',
    AccountExplorer = 'input.stream.accountExplorer',
}

export enum Scheme {
    Page = 'page',
}

export enum ConfigSection {
    AuthProto = 'auth.proto',
    BytestreamProto = 'bytestream.proto',
    inputstreamProto = 'inputstream.proto',
    ApiAddress = 'api.address',
    Verbose = 'verbose',
    BaseURL = 'baseURL',
    BaseDir = 'baseDir',
}

/**
 * Names of commands.
 */
export enum CommandName {
    RefreshSuffix = '.refresh',
    ImagePaste = 'input.stream.image.paste',
    ImageSearch = 'input.stream.image.search',
    InputCreate = 'input.stream.input.create',
    InputOpen = 'input.stream.input.open',
    InputLink = 'input.stream.input.link',
    InputRemove = 'input.stream.input.remove',
    InputPublish = 'input.stream.input.publish',
    InputUnpublish = 'input.stream.input.unpublish',
    Login = 'input.stream.login',
    DeviceLogin = 'input.stream.deviceLogin',
    ViewInputstreamExplorer = 'workbench.view.extension.inputstream-explorer',
    OpenSetting = 'input.stream.openExtensionSetting',
}

export const ThemeIconCircleOutline = new vscode.ThemeIcon('circle-outline');
export const ThemeIconCloudDownload = new vscode.ThemeIcon('cloud-download');
export const ThemeIconDebugContinue = new vscode.ThemeIcon('debug-continue');
export const ThemeIconDebugStackframe = new vscode.ThemeIcon('debug-stackframe');
export const ThemeIconDebugStackframeActive = new vscode.ThemeIcon('debug-stackframe-active');
export const ThemeIconDebugStackframeFocused = new vscode.ThemeIcon('debug-stackframe-focused');
export const ThemeIconDebugStart = new vscode.ThemeIcon('debug-start');
export const ThemeIconFile = new vscode.ThemeIcon('file');
export const ThemeIconQuestion = new vscode.ThemeIcon('question');
export const ThemeIconReport = new vscode.ThemeIcon('report');
export const ThemeIconRss = new vscode.ThemeIcon('rss');
export const ThemeIconTestingPassed = new vscode.ThemeIcon('testing-passed-icon');
export const ThemeIconServer = new vscode.ThemeIcon('server');
export const ThemeIconSymbolEvent = new vscode.ThemeIcon('symbol-event');
export const ThemeIconSymbolInterface = new vscode.ThemeIcon('symbol-interface');
export const ThemeIconVerified = new vscode.ThemeIcon('verified');

/**
 * Values used in the setContext function.
 */
export enum ContextName {
    LoggedIn = 'input.stream.logged-in',
}

/**
 * Values used for view item contexts.
 */
export enum ContextValue {
    Input = 'input',
    Login = 'login',
}

/**
 * Values used as keys in vscode memento API.
 */
export enum MementoName {
    DeviceLoginResponse = 'input.stream.api.DeviceLoginResponse',
    LoginResponse = 'input.stream.api.LoginResponse',
}

/**
 * Values used as button names in vscode.window.showInformationMessage API.
 */
export enum ButtonName {
    Cancel = 'Cancel',
    Confirm = 'Confirm',
    Retry = 'Retry',
    Watch = 'Watch on https://input.stream',
}

export function getInputURI(input: Input): vscode.Uri {
    const url = `${Scheme.Page}://input.stream/${input.owner}/${input.id}/${input.titleSlug}.md`;
    return vscode.Uri.parse(url);
}

export function isInput(input: unknown): input is Input {
    return typeof (input as Input).titleSlug === 'string';
}
