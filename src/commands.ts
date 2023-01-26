import { commands } from "vscode";

export enum BuiltInCommandName {
    SetContext = 'setContext',
    ClosePanel = 'workbench.action.closePanel',
    CloseActiveEditor = 'workbench.action.closeActiveEditor',
    MarkdownPreview = 'markdown.showPreview',
    Open = 'vscode.open',
    OpenFolder = 'vscode.openFolder',
    OpenSettings = 'workbench.action.openSettings',
}

export enum CommandName {
    RefreshSuffix = '.refresh',
    ImageUpload = 'input.stream.image.upload',
    ImageSearch = 'input.stream.image.search',
    InputCreate = 'input.stream.input.create',
    InputDelete = 'input.stream.input.delete',
    InputReplace = 'input.stream.input.replace',
    InputPublish = 'input.stream.input.publish',
    InputUnpublish = 'input.stream.input.unpublish',
    InputView = 'input.stream.input.view',
    InputWatch = 'input.stream.input.watch',
    LoginToken = 'input.stream.loginToken',
    Login = 'input.stream.login',
    ViewInputstreamExplorer = 'workbench.view.extension.inputstream-explorer',
    OpenSetting = 'input.stream.openExtensionSetting',
}

/**
 * Options for the OpenSetting command
 */
type OpenSettingCommandOptions = {
    // The query string
    q: string,
};

export function openExtensionSetting(options: OpenSettingCommandOptions): Thenable<any> {
    return commands.executeCommand(BuiltInCommandName.OpenSettings, options?.q);
}

export function setCommandContext<T>(key: string, value: T) {
    return commands.executeCommand(BuiltInCommandName.SetContext, key, value);
}


/**
 * Values used in the setContext function.
 */
export enum ContextName {
    LoggedIn = 'input.stream.logged-in',
}

