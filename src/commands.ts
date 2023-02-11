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
    InputEdit = 'input.stream.input.edit',
    InputPublish = 'input.stream.input.publish',
    InputUnpublish = 'input.stream.input.unpublish',
    InputView = 'input.stream.input.view',
    InputWatch = 'input.stream.input.watch',
    JwtLogin = 'input.stream.jwtLogin',
    Login = 'input.stream.login',
    Logout = 'input.stream.logout',
    ViewInputstreamExplorer = 'workbench.view.extension.inputstream-explorer',
}

/**
 * Values used in the setContext function.
 */
export enum ContextName {
    LoggedIn = 'input.stream.loggedIn',
}
