import * as vscode from 'vscode';

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
    }

    async handleWorkspaceFoldersChangeEvent(e: vscode.WorkspaceFoldersChangeEvent) {
    }
}
