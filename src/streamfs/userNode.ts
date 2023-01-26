import * as vscode from 'vscode';

import { BuiltInCommandName } from '../commands';
import { DirNode } from './directoryNode';
import { FieldMask } from '../proto/google/protobuf/FieldMask';
import { InputFilterOptions } from '../proto/build/stack/inputstream/v1beta1/InputFilterOptions';
import { InputNode } from './inputNode';
import { makeInputContentFileNodeUri, makeInputNodeUri, makeUserNodeUri } from '../filesystems';
import { NodeContext } from './node';
import { UnaryCallOptions } from '../clients';
import { User } from '../proto/build/stack/auth/v1beta1/User';
import {
    Input,
    _build_stack_inputstream_v1beta1_Input_Type as InputType,
    _build_stack_inputstream_v1beta1_Input_Status as InputStatus,
} from '../proto/build/stack/inputstream/v1beta1/Input';


export class UserNode extends DirNode<InputNode> {
    private hasLoaded = false;

    constructor(
        protected ctx: NodeContext,
        protected user: User,
    ) {
        super(makeUserNodeUri(user));
    }

    async getChildren(): Promise<InputNode[]> {
        if (!this.hasLoaded) {
            const inputs = await this.loadInputs();
            if (inputs) {
                for (const input of inputs) {
                    this.addInputNode(input);
                }
            }
            this.hasLoaded = true;
        }
        return super.getChildren();
    }

    public async replaceInputById(next: Input): Promise<InputNode | undefined> {
        for (const curr of await this.getChildren()) {
            if (curr.input.id === next.id) {
                this.removeChild(curr);
                return this.addInputNode(next);
            }
        }
    }

    public addInputNode(input: Input): InputNode {
        return this.addChild(new InputNode(this.ctx, this.user, input));
    }

    async rename(src: string, dst: string): Promise<InputNode> {
        const oldChild = await this.getChild(src);
        if (!(oldChild instanceof InputNode)) {
            throw vscode.FileSystemError.FileNotFound(src);
        }
        const input = await oldChild.updateTitle(dst);
        if (!input) {
            throw vscode.FileSystemError.Unavailable(`rename title operation failed`);
        }
        this.removeChild(oldChild);
        return this.addInputNode(input);
    }

    createFile(name: string, data?: Uint8Array): Promise<InputNode> {
        throw vscode.FileSystemError.NoPermissions('create file not supported; use create directory to initialize a new Input');
    }

    async createDirectory(name: string): Promise<InputNode> {
        const client = this.ctx.inputsClient;

        let input: Input | undefined = {
            status: 'STATUS_DRAFT',
            title: name,
            owner: this.user.login,
            login: this.user.login,
            type: InputType.TYPE_SHORT_POST,
        };

        try {
            input = await client.createInput(input);
        } catch (e) {
            let message = '(no details available)';
            if (e instanceof Error) {
                message = e.message;
            }
            throw vscode.FileSystemError.Unavailable(`inputstream createInput failed: ${message}`);
        }
        if (!input) {
            throw vscode.FileSystemError.Unavailable(`create input failed to initialize document`);
        }

        setTimeout(() => {
            vscode.commands.executeCommand(BuiltInCommandName.Open, makeInputContentFileNodeUri(input!));
        }, 1);

        return this.addInputNode(input);
    }

    async deleteChild(name: string): Promise<void> {
        const child = await this.getChild(name);
        if (!child) {
            throw vscode.FileSystemError.FileNotFound(name);
        }
        const client = this.ctx.inputsClient;
        const selection = await vscode.window.showInformationMessage(`Are you sure you want to delete ${name}?`, 'Delete', 'Cancel');
        if (selection !== 'Delete') {
            return;
        }
        await client.removeInput(child.input.id!);
        this.removeChild(child);
        this._mtime = Date.now();
    }

    async getChild(name: string): Promise<InputNode | undefined> {
        const child = await super.getChild(name);
        if (child) {
            return child;
        }
        const input = await this.fetchInputByTitle(this.user.login!, name);
        if (!input) {
            return;
        }
        return this.addInputNode(input);
    }

    protected async loadInputs(): Promise<Input[] | undefined> {
        const client = this.ctx.inputsClient;
        return client.listInputs({
            login: this.user.login,
        });
    }

    protected async fetchInputByTitle(login: string, title: string): Promise<Input | undefined> {
        const client = this.ctx.inputsClient;
        try {
            const filter: InputFilterOptions = { login, title };
            const mask: FieldMask = { paths: ['content'] };
            const options: UnaryCallOptions = { limit: 1, silent: true };
            const input = await client.getInput(filter, mask, options);
            return input;
        } catch (e) {
            console.log(`could not fetch input: ${login}/${title}`, e);
            return undefined;
        }
    }

    public async createInput(request: Input): Promise<InputNode> {
        const client = this.ctx.inputsClient;
        const input = await client.createInput(request);
        return this.addInputNode(input!);
    }

}
