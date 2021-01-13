
export const ExtensionID = 'stackbuild.vscode-inputstream';
export const ExtensionName = 'vscode-inputstream';
export const AIKey = 'e3f8a9c5-e968-47e5-a411-341f71f67ee4';

export enum Telemetry {
    ExtensionActivate = 'ext.activate',
    ExtensionDeactivate = 'ext.deactivate',
    FeatureActivate = 'feature.activate',
    FeatureDeactivate = 'feature.deactivate',
}

export enum BuiltInCommands {
	SetContext = 'setContext',
    ClosePanel = 'workbench.action.closePanel',
    MarkdownPreview = 'markdown.showPreview',
    Open = 'vscode.open',
    OpenFolder = 'vscode.openFolder',
    OpenSettings = 'workbench.action.openSettings',
    RevealFileInOS = 'revealFileInOS',
}
