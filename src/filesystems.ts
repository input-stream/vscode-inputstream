import * as vscode from 'vscode';
import * as crypto from 'crypto';

import { User } from './proto/build/stack/auth/v1beta1/User';
import {
    Input,
    _build_stack_inputstream_v1beta1_Input_Type as InputType,
    _build_stack_inputstream_v1beta1_Input_Status as InputStatus,
} from './proto/build/stack/inputstream/v1beta1/Input';
import { File } from './proto/build/stack/inputstream/v1beta1/File';
import { childUri } from './uris';

export const activeCodeWorkspaceName = 'active.code-workspace';

export const MAX_CLIENT_BODY_SIZE = 10 * 1024 * 1024; // upload size limit

export enum FolderName {
    Stream = 'Stream',
}

export enum Scheme {
    Stream = 'stream',
}

export function getInputURI(input: Input): vscode.Uri {
    const url = `${Scheme.Stream}:/${input.owner}/${input.id}/${input.titleSlug}.md`;
    return vscode.Uri.parse(url);
}

export function isInput(input: unknown): input is Input {
    return typeof (input as Input).titleSlug === 'string';
}

export const streamRootUri = vscode.Uri.parse(`${Scheme.Stream}:/`);

export function makeUserNodeUri(user: User): vscode.Uri {
    return childUri(streamRootUri, user.login!);
}

export function makeInputNodeUri(input: Input): vscode.Uri {
    return childUri(streamRootUri, input.login!, input.title!);
}

export function makeInputFileNodeUri(input: Input, file: File): vscode.Uri {
    return childUri(streamRootUri, input.login!, input.title!, file.name!);
}

export function makeInputContentFileNodeUri(input: Input): vscode.Uri {
    return childUri(streamRootUri, input.login!, input.title!, makeInputContentName(input));
}

export function makeInputContentName(input: Input): string {
    const status: InputStatus = input.status!;
    let name = input.titleSlug!;
    switch (status) {
        case InputStatus.STATUS_DRAFT:
            name += ".draft";
            break;
        case InputStatus.STATUS_PUBLISHED:
            name += ".published";
            break;
        default:
            throw vscode.FileSystemError.NoPermissions(`content status not supported: ${status}`);
    }
    name += ".md";
    return name;
}

export function makeBytestreamUploadResourceName(id: string, sha256: string, size: number): string {
    return `/uploads/${id}/blobs/${sha256}/${size}`;
}

export function makeBytestreamDownloadResourceName(sha256: string, size: number): string {
    return `/blobs/${sha256}/${size}`;
}

export function makeInputExternalViewUrl(input: Input): vscode.Uri {
    return vscode.Uri.parse(`https://input.stream/@${input.login}/${input.titleSlug}/view`);
}

export function makeInputExternalWatchUrl(input: Input): vscode.Uri {
    return vscode.Uri.parse(`https://input.stream/@${input.login}/${input.titleSlug}/view/watch`);
}

export function sha256Bytes(buf: Buffer): string {
    const hashSum = crypto.createHash('sha256');
    hashSum.update(buf);
    const hex = hashSum.digest('hex');
    return hex;
}

export function getContentTypeForExtension(ext: string): string | undefined {
    switch (ext) {
        case '.apng':
            return 'image/apng';
        case '.avif':
            return 'image/avif';
        case '.gif':
            return 'image/gif';
        case '.jpeg':
            return 'image/jpeg';
        case '.jpg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        case '.svg':
            return 'image/svg+xml';
        case '.webp':
            return 'image/webp';
    }
}

export const imageExtensionNames = [
    'apng',
    'avif',
    'gif',
    'jpeg',
    'jpg',
    'png',
    'svg',
    'webp',
];
