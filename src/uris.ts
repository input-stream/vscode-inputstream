import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import { Scheme } from './filesystems';
import { Input } from './proto/build/stack/inputstream/v1beta1/Input';
import { MediaIconName } from './views';

export const loginUri = vscode.Uri.parse('https://input.stream/settings/extensions/stackbuild.vscode-inputstream/login');

export function childUri(uri: vscode.Uri, ...names: string[]): vscode.Uri {
    return Utils.joinPath(uri, ...names);
}

export function mediaIconUri(extensionUri: vscode.Uri, name: MediaIconName): vscode.Uri {
    return Utils.joinPath(extensionUri, 'media', name);
}

export function cssResourceUri(extensionUri: vscode.Uri, name: string): vscode.Uri {
    return Utils.joinPath(extensionUri, 'resources', 'css', name);
}

export function getInputURI(input: Input): vscode.Uri {
    const url = `${Scheme.Stream}:/${input.owner}/${input.id}/${input.titleSlug}.md`;
    return vscode.Uri.parse(url);
}

export function isInput(input: unknown): input is Input {
    return typeof (input as Input).titleSlug === 'string';
}

export function parseQuery(uri: vscode.Uri): { [key: string]: string } {
    return uri.query.split('&').reduce((prev: any, current) => {
        const queryString = current.split('=');
        prev[queryString[0]] = queryString[1];
        return prev;
    }, {});
}
