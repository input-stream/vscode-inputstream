import * as vscode from 'vscode';

import { Input, _build_stack_inputstream_v1beta1_Input_Status as InputStatus } from './proto/build/stack/inputstream/v1beta1/Input';
import { Context, VSCodeCommands, VSCodeWindow } from './context';
import { IInputsClient } from './inputStreamClient';
import { User } from './proto/build/stack/auth/v1beta1/User';
import { TreeController } from './treeController';
import { BuiltInCommandName } from './commands';
import { formatTimestampISODate } from './dates';
import { makeInputContentFileNodeUri } from './filesystems';
import { ViewName, ContextValue, ThemeIconTestingPassed } from './views';

/**
 * Renders a view for user inputs.
 */
export class InputsExplorer extends TreeController<Input> {
    private user: User | undefined;

    constructor(
        ctx: Context,
        window: VSCodeWindow,
        commands: VSCodeCommands,
        private client: IInputsClient,
    ) {
        super(ctx, window, commands, ViewName.InputExplorer);

        ctx.add(this.view.onDidChangeVisibility(this.handleVisibilityChange, this));
    }

    public handleUserLogin(user: User): void {
        this.user = user;
        this.refresh();
    }

    handleVisibilityChange(event: vscode.TreeViewVisibilityChangeEvent) {
        if (event.visible) {
            this.refresh();
        }
    }

    public async getParent(input?: Input): Promise<Input | undefined> {
        return undefined;
    }

    public getTreeItem(input: Input): vscode.TreeItem {
        return new InputItem(input);
    }

    async getRootItems(): Promise<Input[] | undefined> {
        if (!this.client) {
            return undefined;
        }
        if (!this.user) {
            return undefined;
        }
        try {
            const inputs = await this.client.listInputs({
                owner: this.user.login!,
            });
            if (!inputs) {
                return undefined;
            }
            return inputs;
        } catch (err) {
            if (err instanceof Error) {
                console.log(`Could not list Inputs: ${err.message}`);
            }
            return undefined;
        }
    }

}

export class InputItem extends vscode.TreeItem {

    constructor(
        public input: Input,
        public label?: string,
        public parent?: InputItem,
    ) {
        super(label || `"${input.title!}"`);

        const when = formatTimestampISODate(input.createdAt);

        this.id = input.id;
        this.label = `${when}`;
        this.tooltip = `${when}: "${input.title}" (${input.id})`;
        this.contextValue = ContextValue.Input;
        this.iconPath = input.status === InputStatus.STATUS_PUBLISHED ? ThemeIconTestingPassed : undefined;
        this.description = `${input.title}`;
        this.command = {
            title: 'Open File',
            command: BuiltInCommandName.Open,
            arguments: [makeInputContentFileNodeUri(input)],
        };
    }

    async getChildren(): Promise<Input[] | undefined> {
        return undefined;
    }
}
