import * as vscode from 'vscode';

import { CommandName } from '../commands';
import { FileNode } from './fileNode';
import { Input, _build_stack_inputstream_v1beta1_Input_Status as InputStatus } from '../proto/build/stack/inputstream/v1beta1/Input';
import { makeInputContentFileNodeUri, makeInputNodeUri } from '../filesystems';
import { NodeContext } from './node';
import { TextEncoder, TextDecoder } from 'util';


export class ContentFileNode extends FileNode {
    private data: Uint8Array | undefined;

    get size(): number {
        return this.data ? this.data.byteLength : 0;
    }

    constructor(
        private ctx: NodeContext,
        private input: Input,
    ) {
        super(makeInputContentFileNodeUri(input));
        this.ctimeTimestamp = input.createdAt;
        this.mtimeTimestamp = input.updatedAt;

        if (input.content?.shortPost?.markdown) {
            this.data = new TextEncoder().encode(input.content?.shortPost?.markdown);
        }
    }

    async getData(): Promise<Uint8Array> {
        if (!this.data) {
            this.data = await this.loadData();
        }
        return this.data;
    }

    async setData(data: Uint8Array): Promise<void> {
        if (this.input.status === InputStatus.STATUS_PUBLISHED) {
            const selection = await vscode.window.showInformationMessage(`You can't edit a published page.  Would you like to convert it to a draft?`, 'Yes', 'Cancel');
            if (selection === 'Yes') {
                vscode.commands.executeCommand(CommandName.InputUnpublish, makeInputNodeUri(this.input));
                return;
            }
            throw vscode.FileSystemError.NoPermissions(`ReadOnly File`);
        }

        const client = this.ctx.inputsClient;

        this.input.content = {
            shortPost: {
                markdown: new TextDecoder().decode(data),
            }
        };

        const response = await client.updateInput(this.input, { paths: ['content'] });
        this.mtimeTimestamp = response.input?.updatedAt;
        this.data = data;

        if (response.input?.title && response.input.title !== this.input.title) {
            const current = this.input;
            const next = response.input;
            setTimeout(() => {
                vscode.commands.executeCommand(CommandName.InputReplace, makeInputNodeUri(current), makeInputNodeUri(next), next);
            }, 50);
        }
    }

    private async loadData(): Promise<Uint8Array> {
        const client = this.ctx.inputsClient;
        const input = await client.getInput({ login: this.input.login, id: this.input.id }, { paths: ['content'] });
        this.input.content = input?.content;
        return new TextEncoder().encode(input?.content?.shortPost?.markdown);
    }
}
