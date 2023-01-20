import * as vscode from 'vscode';
import * as fsExtra from 'fs-extra';
import { formatTimestampISODate } from '../../common';
import { InputStep, MultiStepInput } from '../../multiStepInput';
import { BuiltInCommands, FolderName } from '../../constants';
import {
    Input,
    _build_stack_inputstream_v1beta1_Input_Type as InputType,
    _build_stack_inputstream_v1beta1_Input_Status as InputStatus
} from '../../proto/build/stack/inputstream/v1beta1/Input';
import { InputStreamClient } from '../inputStreamClient';
import { ButtonName, CommandName, getInputURI, isInput } from '../constants';
import { PageFileSystemProvider } from './filesystem';
import { User } from '../../proto/build/stack/auth/v1beta1/User';
import { BytesClient } from '../byteStreamClient';
import path = require('path');

/**
 * Controller for page commands.
 */
export class PageController implements vscode.Disposable {
    protected disposables: vscode.Disposable[] = [];
    protected client: InputStreamClient | undefined;
    protected fs: PageFileSystemProvider;

    constructor(
        private user: User,
        onDidInputStreamClientChange: vscode.EventEmitter<InputStreamClient>,
        onDidByteStreamClientChange: vscode.EventEmitter<BytesClient>,
    ) {
        onDidInputStreamClientChange.event(this.handleInputStreamClientChange, this, this.disposables);

        this.fs = new PageFileSystemProvider(
            user,
            onDidInputStreamClientChange.event,
            onDidByteStreamClientChange.event,
        );
        this.disposables.push(this.fs);

        this.installWorkspaceFolder();

    }

    public filesystem(): vscode.FileSystem {
        return this.fs.filesystem();
    }

    private installWorkspaceFolder(): void {
        const name = FolderName.Stream;
        const uri = vscode.Uri.parse('stream:/pcj');

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

    private handleInputStreamClientChange(client: InputStreamClient) {
        this.client = client;
    }

    async openHtmlUrl(input: Input, watch = true) {
        let target = input.htmlUrl;
        if (!target) {
            target = input.status === InputStatus.STATUS_PUBLISHED ? input.titleSlug : input.id;
        }
        if (watch) {
            target += '/view/watch';
        }
        const uri = vscode.Uri.parse(target!);
        return vscode.commands.executeCommand(BuiltInCommands.Open, uri);
    }

    public dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
    }

}
