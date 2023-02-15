import * as vscode from 'vscode';

import { BuiltInCommandName } from '../commands';
import { activeCodeWorkspaceName, Scheme } from '../filesystems';
import { childUri } from '../uris';
import { NodeContext } from './node';
import { StaticDirectoryNode } from './staticDirectoryNode';
import { StaticFileNode } from './staticFileNode';


export class VscodeDirectoryNode extends StaticDirectoryNode {
    constructor(
        private ctx: NodeContext,
        uri: vscode.Uri,
    ) {
        super(uri);
        vscode.workspace.onDidChangeWorkspaceFolders(this.handleWorkspaceFoldersChangeEvent, this);

        this.addChild(StaticFileNode.fromJson(childUri(uri, "settings.json"), {
            "markdown.experimental.editor.pasteLinks.enabled": true,
            "editor.experimental.pasteActions.enabled": true
        }));
        this.recreateActiveCodeWorkspace();
    }

    async handleWorkspaceFoldersChangeEvent(e: vscode.WorkspaceFoldersChangeEvent) {
        await this.recreateActiveCodeWorkspace();
    }

    async recreateActiveCodeWorkspace() {
        const child = await this.getChild(activeCodeWorkspaceName);
        if (child) {
            this.removeChild(child);
        }
        const wsUri = vscode.Uri.parse(`${Scheme.Stream}:/${this.name}/${activeCodeWorkspaceName}`);
        this.addChild(StaticFileNode.fromJson(wsUri, this.makeActiveCodeWorkspace()));
        this.ctx.notifyFileChanges(
            {
                uri: wsUri,
                type: vscode.FileChangeType.Deleted,
            },
            {
                uri: wsUri,
                type: vscode.FileChangeType.Created,
            },
            {
                uri: vscode.Uri.parse(`${Scheme.Stream}:/${this.name}`),
                type: vscode.FileChangeType.Changed
            }
        );
        if (vscode.window.activeTextEditor?.document.uri.toString() === wsUri.toString()) {
            vscode.commands.executeCommand(BuiltInCommandName.CloseActiveEditor);
            vscode.commands.executeCommand(BuiltInCommandName.Open, wsUri);
        }
    }

    makeActiveCodeWorkspace(): { folders: { name: string, uri: string, path?: string }[] } {
        const folders = [];
        for (const folder of vscode.workspace.workspaceFolders || []) {
            folders.push({ name: folder.name, uri: folder.uri.toString() });
        }
        return { folders };
    }
}
