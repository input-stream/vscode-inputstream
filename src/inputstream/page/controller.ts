import * as vscode from 'vscode';
import * as fsExtra from 'fs-extra';

import path = require('path');

import { BuiltInCommands, FolderName } from '../../constants';
import { IByteStreamClient } from '../byteStreamClient';
import { InputsGRPCClient } from '../inputStreamClient';
import { PageFileSystemProvider } from './filesystem';
import { User } from '../../proto/build/stack/auth/v1beta1/User';

export class PageController implements vscode.Disposable {
    protected disposables: vscode.Disposable[] = [];
    protected fs: PageFileSystemProvider;

    constructor(
        user: User,
        inputsClient: InputsGRPCClient,
        bytestreamClient: IByteStreamClient,
    ) {
        this.fs = new PageFileSystemProvider(
            user,
            inputsClient,
            bytestreamClient,
        );
        this.disposables.push(this.fs);

        this.installWorkspaceFolder();
    }

    private installWorkspaceFolder(): void {
        const name = FolderName.Stream;
        const uri = vscode.Uri.parse('stream:/');

        const folders = vscode.workspace.workspaceFolders || [];
        const found = folders.find((f: vscode.WorkspaceFolder) => f.name === name);
        const start = found ? found.index : folders.length;
        const deleteCount = found ? 1 : 0;
        const numOthers = folders.length - deleteCount;

        // if we're the only folder in the instance or it's already a multiroot
        // workspace, don't do anything fancy.
        if (numOthers === 0 || numOthers > 2) {
            vscode.workspace.updateWorkspaceFolders(start, deleteCount, { name, uri });
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
        folderData.push({ name, uri: uri.toString() });

        const fsPath = folders[0].uri.fsPath;
        const dirname = path.dirname(fsPath);
        const basename = path.basename(fsPath) + ".code-workspace";
        const filename = path.join(dirname, basename);

        fsExtra.writeFileSync(filename, JSON.stringify({ folders: folderData }));

        vscode.commands.executeCommand(BuiltInCommands.OpenFolder, vscode.Uri.file(filename));
    }

    public dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
    }

}
