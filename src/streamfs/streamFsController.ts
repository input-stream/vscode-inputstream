import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';

import { childUri, parseQuery } from '../uris';
import { CommandName, BuiltInCommandName } from '../commands';
import { Context, VSCodeCommands, VSCodeWorkspace } from '../context';
import { File } from '../proto/build/stack/inputstream/v1beta1/File';
import { FolderName, makeInputContentFileNodeUri, getContentTypeForExtension, makeInputExternalViewUrl, makeInputExternalWatchUrl, makeInputNodeUri, MAX_CLIENT_BODY_SIZE, streamRootUri, makeUserNodeUri, imageExtensionNames } from '../filesystems';
import { IByteStreamClient } from '../byteStreamClient';
import { IInputsClient } from '../inputStreamClient';
import { Input, _build_stack_inputstream_v1beta1_Input_Type as InputType, _build_stack_inputstream_v1beta1_Input_Status as InputStatus, } from '../proto/build/stack/inputstream/v1beta1/Input';
import { InputNode } from './inputNode';
import { inputNodePredicate, StreamFs, userNodePredicate } from './streamFs';
import { InputStep, MultiStepInput } from '../multiStepInput';
import { Readable } from 'stream';
import { StaticDirectoryNode } from './staticDirectoryNode';
import { StaticFileNode } from './staticFileNode';
import { User } from '../proto/build/stack/auth/v1beta1/User';
import { UserNode } from './userNode';
import { Utils } from 'vscode-uri';
import { VscodeDirectoryNode } from './vscodeDirectoryNode';
import { WriteRequest } from '../proto/google/bytestream/WriteRequest';
import { WriteResponse } from '../proto/google/bytestream/WriteResponse';


export class StreamFsController {
    private user: User | undefined;
    protected fs: StreamFs;

    constructor(
        ctx: Context,
        private commands: VSCodeCommands,
        private workspace: VSCodeWorkspace,
        inputsClient: IInputsClient,
        private byteStreamClient: IByteStreamClient,
    ) {
        this.fs = new StreamFs(
            ctx,
            workspace,
            inputsClient,
            byteStreamClient,
            this,
        );

        ctx.add(commands.registerCommand(CommandName.InputCreate, this.handleCommandInputCreate, this));
        ctx.add(commands.registerCommand(CommandName.InputReplace, this.handleCommandInputReplace, this));
        ctx.add(commands.registerCommand(CommandName.InputView, this.handleCommandInputView, this));
        ctx.add(commands.registerCommand(CommandName.InputWatch, this.handleCommandInputWatch, this));
        ctx.add(commands.registerCommand(CommandName.InputPublish, this.handleCommandInputPublish, this));
        ctx.add(commands.registerCommand(CommandName.InputUnpublish, this.handleCommandInputUnPublish, this));
        ctx.add(commands.registerCommand(CommandName.InputDelete, this.handleCommandInputDelete, this));
        ctx.add(commands.registerCommand(CommandName.ImageUpload, this.handleCommandImageUpload, this));

        this.installWorkspaceFolder(workspace, commands);
    }

    public handleUserLogin(user: User): void {
        this.user = user;
        const profile = this.fs.root.addChild(
            new StaticDirectoryNode(childUri(this.fs.root.uri, '.profile')));
        profile.addChild(
            StaticFileNode.fromJson(childUri(profile.uri, 'config.json'), {
                "name": user.name,
                "avatarUrl": user.avatarUrl,
                "splashUrl": user.splashUrl,
                "email": user.email,
            }));
        this.fs.root.addChild(
            new VscodeDirectoryNode(this.fs.root.ctx, childUri(this.fs.root.uri, '.vscode')));
        this.fs.root.addChild(
            new UserNode(this.fs.root.ctx, user));
    }

    private installWorkspaceFolder(workspace: VSCodeWorkspace, commands: VSCodeCommands): void {
        const name = FolderName.Stream;

        const folders = workspace.workspaceFolders || [];
        const found = folders.find((f: vscode.WorkspaceFolder) => f.name === name);
        const start = found ? found.index : folders.length;
        const deleteCount = found ? 1 : 0;
        const numOthers = folders.length - deleteCount;

        // if we're the only folder in the instance or it's already a multiroot
        // workspace, don't do anything fancy.
        if (numOthers === 0 || numOthers > 2) {
            workspace.updateWorkspaceFolders(start, deleteCount, { name, uri: streamRootUri });
            return;
        }

        // otherwise, avoid the dreaded 'Untitled' workspace by writing a
        // pseudo-temporary file for this and opening it.
        const folderData: { name: string, uri: string }[] = folders.map(f => {
            return {
                name: f.name,
                uri: f.uri.toString(),
            };
        });
        folderData.push({ name, uri: streamRootUri.toString() });

        const uri = folders[0].uri;
        const dirUri = Utils.dirname(uri);
        const fileUri = Utils.joinPath(dirUri, Utils.basename(uri) + ".code-workspace");
        const content = Buffer.from(JSON.stringify({ folders: folderData }, null, 4));
        vscode.workspace.fs.writeFile(fileUri, content);

        commands.executeCommand(BuiltInCommandName.Open, fileUri);
    }

    private async handleCommandInputCreate() {
        const user = this.user;
        if (!user) {
            return;
        }

        const request: Input = {
            status: InputStatus.STATUS_DRAFT,
            owner: user.login,
            login: user.login,
            type: InputType.TYPE_SHORT_POST,
        };

        const setTitle: InputStep = async (msi) => {
            const title = await msi.showInputBox({
                title: 'Title',
                totalSteps: 1,
                step: 1,
                value: '',
                prompt: 'Choose a title (you can always change it later)',
                validate: async (value: string) => { return ''; },
                shouldResume: async () => false,
            });
            if (title) {
                request.title = title;
            }
            return undefined;
        };

        await MultiStepInput.run(setTitle);
        if (!request.title) {
            return;
        }

        const userUri = makeUserNodeUri(user);
        const userNode = await this.fs.lookup<UserNode>(userUri, false, userNodePredicate);
        if (!userNode) {
            return;
        }

        try {
            const inputNode = await userNode.createInput(request);
            this.commands.executeCommand(BuiltInCommandName.Open, inputNode.uri);
        } catch (err) {
            if (err instanceof Error) {
                vscode.window.showErrorMessage(`Could not create: ${err.message}`);
            }
        }
    }

    public async handleCommandImageUpload() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const docUri = editor.document.uri;
        if (!docUri) {
            return;
        }
        const node = await this.fs.lookup<InputNode>(docUri, true, inputNodePredicate);
        if (!node) {
            return;
        }

        const options: vscode.OpenDialogOptions = {
            canSelectMany: true,
            openLabel: 'Upload',
            filters: {
                'Images': imageExtensionNames,
            }
        };

        const fileUris = await vscode.window.showOpenDialog(options);
        if (!fileUris || fileUris.length === 0) {
            return;
        }

        const files = fileUris.map(async (uri: vscode.Uri): Promise<File> => {
            const name = Utils.basename(uri);
            const ext = Utils.extname(uri);
            const contentType = getContentTypeForExtension(ext);
            const data = await this.workspace.fs.readFile(uri);
            return { name, contentType, data };
        });

        const uploaded = await node.uploadFiles(await Promise.all(files));
        const uploadedUris = uploaded.map(
            node => node.uri);
        const links = uploaded.map(node =>
            `![${node.file.contentType}](./${Utils.basename(node.uri)})`);
        const content = links.join("\n");

        editor.edit((edit) => {
            const selection = editor.selection;
            if (selection.isEmpty) {
                edit.insert(selection.start, content);
            } else {
                edit.replace(selection, content);
            }
        });

        const events: vscode.FileChangeEvent[] = uploadedUris.map(uri => {
            return { uri, type: vscode.FileChangeType.Created };
        });
        events.push({ uri: docUri, type: vscode.FileChangeType.Changed });

        this.fs.root.ctx.notifyFileChanges(...events);
    }



    private async handleCommandInputView(uri: vscode.Uri): Promise<boolean> {
        const node = await this.fs.lookup<InputNode>(uri, true, inputNodePredicate);
        if (!node) {
            return false;
        }
        return vscode.env.openExternal(makeInputExternalViewUrl(node.input));
    }

    private async handleCommandInputWatch(uri: vscode.Uri): Promise<boolean> {
        const node = await this.fs.lookup<InputNode>(uri, true, inputNodePredicate);
        if (!node) {
            return false;
        }
        return vscode.env.openExternal(makeInputExternalWatchUrl(node.input));
    }

    private async handleCommandInputPublish(uri: vscode.Uri): Promise<Input | undefined> {
        const selection = await vscode.window.showInformationMessage(`This page will be publically accessible.  Update page status?`, 'Proceed', 'Cancel');
        if (selection !== 'Proceed') {
            return;
        }
        const input = await this.updateInputStatus(uri, InputStatus.STATUS_PUBLISHED);
        if (input) {
            vscode.env.openExternal(makeInputExternalViewUrl(input));
        }
        return input;
    }

    private async handleCommandInputUnPublish(uri: vscode.Uri): Promise<Input | undefined> {
        const selection = await vscode.window.showInformationMessage(`This page will no longer be available to the public.  Update page status?`, 'Proceed', 'Cancel');
        if (selection !== 'Proceed') {
            return;
        }

        const input = await this.updateInputStatus(uri, InputStatus.STATUS_DRAFT);
        if (input) {
            vscode.env.openExternal(makeInputExternalWatchUrl(input));
        }
        return input;
    }

    private async handleCommandInputReplace(oldUri: vscode.Uri, newUri: vscode.Uri, next: Input): Promise<void> {
        const node = await this.fs.lookup<UserNode>(oldUri, true, userNodePredicate);
        if (!node) {
            return;
        }
        const selection = vscode.window.activeTextEditor?.selection;
        vscode.commands.executeCommand(BuiltInCommandName.CloseActiveEditor);

        await node.replaceInputById(next);

        this.fs.root.ctx.notifyFileChanges(
            { type: vscode.FileChangeType.Deleted, uri: oldUri },
            { type: vscode.FileChangeType.Created, uri: newUri }
        );

        setTimeout(async () => {
            await vscode.commands.executeCommand(BuiltInCommandName.Open, makeInputContentFileNodeUri(next));
            if (selection && vscode.window.activeTextEditor) {
                vscode.window.activeTextEditor.selection = selection;
            }
        }, 20);
    }

    async handleCommandInputDelete(uri: vscode.Uri) {
        const node = await this.fs.lookup<InputNode>(uri, true, inputNodePredicate);
        if (!node) {
            return;
        }
        return this.fs.delete(makeInputNodeUri(node.input));
    }

    private async updateInputStatus(uri: vscode.Uri, status: InputStatus): Promise<Input | undefined> {
        const node = await this.fs.lookup<InputNode>(uri, true, inputNodePredicate);
        if (!node) {
            return;
        }
        const input = await node.updateStatus(status);
        vscode.commands.executeCommand(BuiltInCommandName.CloseActiveEditor);
        this.fs.root.ctx.notifyFileChanges(
            { type: vscode.FileChangeType.Deleted, uri },
            { type: vscode.FileChangeType.Created, uri }
        );
        if (input) {
            setTimeout(() => {
                vscode.commands.executeCommand(BuiltInCommandName.Open, makeInputContentFileNodeUri(input));
            }, 20);
        }
        return input;
    }

    public upload(source: vscode.Uri, target: vscode.Uri, options: { overwrite: boolean }): Thenable<void> {
        return vscode.window.withProgress<void>(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Uploading ${Utils.basename(target)}...`,
                cancellable: true,
            },
            (progress: vscode.Progress<{
                message?: string | undefined,
                increment?: number | undefined,
            }>, token: vscode.CancellationToken): Promise<void> => {
                return new Promise<void>(async (resolve, reject) => {
                    const query = parseQuery(target);
                    const fileContentType = query['fileContentType'];
                    if (!fileContentType) {
                        reject('target URI must have query param fileContentType');
                        return;
                    }
                    const resourceName = query['resourceName'];
                    if (!resourceName) {
                        reject('target URI must have query param resourceName');
                        return;
                    }
                    const size = parseInt(Utils.basename(vscode.Uri.file(resourceName)));
                    // send the filename and content-type as metadata since the
                    // resource name is really just the content hash.
                    const md = new grpc.Metadata();
                    md.set('filename', target.path);
                    md.set('file-content-type', fileContentType);

                    if (size > MAX_CLIENT_BODY_SIZE) {
                        reject(new Error(`cannot upload ${target.path} (${size}b > ${MAX_CLIENT_BODY_SIZE}`));
                        return;
                    }

                    // prepare the call.
                    const call = this.byteStreamClient?.write((err: grpc.ServiceError | null | undefined, resp: WriteResponse | undefined) => {
                        console.log(`write response: committed size: ${resp?.committedSize}`);
                    }, md);

                    call?.on('status', (status: grpc.StatusObject) => {
                        if (token.isCancellationRequested) {
                            reject('Cancellation Requested');
                            return;
                        }
                        switch (status.code) {
                            case grpc.status.OK:
                                resolve();
                                break;
                            case grpc.status.CANCELLED:
                                reject(new Error(`file upload cancelled: ${status.details} (code ${status.code})`));
                                break;
                            default:
                                reject(new Error(`file upload failed: ${status.details} (code ${status.code})`));
                                break;
                        }
                    });

                    call?.on('error', (err: Error) => {
                        reject(err);
                    });

                    call?.on('end', () => {
                        resolve();
                    });

                    const chunkSize = 65536;
                    const increment = (chunkSize / size) * 100;
                    const data = await this.workspace.fs.readFile(source); // TODO: streamable API?
                    const stream = Readable.from(data, {
                        highWaterMark: chunkSize,
                    });

                    let offset = 0;
                    stream.on('data', (chunk: Buffer) => {
                        if (token.isCancellationRequested) {
                            reject('Cancellation Requested');
                            return;
                        }

                        const nextOffset = offset + chunk.length;
                        const req: WriteRequest = {
                            resourceName: resourceName,
                            writeOffset: offset,
                            data: chunk,
                            finishWrite: nextOffset === size,
                        };
                        offset = nextOffset;

                        call?.write(req);

                        progress.report({ increment });
                    });

                    stream.on('error', (err: any) => {
                        reject(err);
                    });

                    stream.on('end', () => {
                        call?.end();
                    });
                });
            },
        );
    }

}