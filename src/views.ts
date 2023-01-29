import { ThemeIcon } from "vscode";

/**
 * Values used as button names in vscode.window.showInformationMessage API.
 */
export enum ButtonName {
    OK = 'Ok',
    Cancel = 'Cancel',
    Confirm = 'Confirm',
    Retry = 'Retry',
    Watch = 'Watch on https://input.stream',
}

export enum ViewName {
    InputExplorer = 'input.stream.inputExplorer',
    ProfileExplorer = 'input.stream.profileExplorer',
}

export enum TreeItemLabels {
    Login = 'Login',
}

export enum CommandDescriptions {
    ClickToLogin = 'Click to login',
}

/**
 * Values used for view item contexts.
 */
export enum ContextValue {
    Input = 'input',
    Login = 'login',
}

export enum MediaIconName {
    Astronaut = 'astronaut.svg',
    UnsplashDark = 'unsplash-dark.svg',
    UnsplashLight = 'unsplash-light.svg',
}

export const ThemeIconCircleOutline = new ThemeIcon('circle-outline');
export const ThemeIconCloudDownload = new ThemeIcon('cloud-download');
export const ThemeIconDebugContinue = new ThemeIcon('debug-continue');
export const ThemeIconDebugStackframe = new ThemeIcon('debug-stackframe');
export const ThemeIconDebugStackframeActive = new ThemeIcon('debug-stackframe-active');
export const ThemeIconDebugStackframeFocused = new ThemeIcon('debug-stackframe-focused');
export const ThemeIconDebugStart = new ThemeIcon('debug-start');
export const ThemeIconFile = new ThemeIcon('file');
export const ThemeIconQuestion = new ThemeIcon('question');
export const ThemeIconReport = new ThemeIcon('report');
export const ThemeIconRss = new ThemeIcon('rss');
export const ThemeIconTestingPassed = new ThemeIcon('testing-passed-icon');
export const ThemeIconServer = new ThemeIcon('server');
export const ThemeIconSymbolEvent = new ThemeIcon('symbol-event');
export const ThemeIconSymbolInterface = new ThemeIcon('symbol-interface');
export const ThemeIconVerified = new ThemeIcon('verified');
