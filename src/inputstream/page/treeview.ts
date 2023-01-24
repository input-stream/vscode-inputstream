import * as vscode from 'vscode';

import { BuiltInCommands } from '../../constants';
import { ContextValue, ThemeIconTestingPassed, ViewName } from '../constants';
import { formatTimestampISODate } from '../../common';
import { IInputsClient } from '../inputStreamClient';
import { Input, _build_stack_inputstream_v1beta1_Input_Status as InputStatus } from '../../proto/build/stack/inputstream/v1beta1/Input';
import { makeInputContentFileNodeUri } from './filesystem';
import { TreeDataProvider } from '../treedataprovider';
import { User } from '../../proto/build/stack/auth/v1beta1/User';

/**
 * Renders a view for user pages.
 */
export class PageTreeView extends TreeDataProvider<Input> {

    constructor(
        private user: User,
        private client: IInputsClient,
    ) {
        super(ViewName.InputExplorer);

        this.view.onDidChangeVisibility(this.handleVisibilityChange, this, this.disposables);
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
            command: BuiltInCommands.Open,
            arguments: [makeInputContentFileNodeUri(input)],
        };
    }

    async getChildren(): Promise<Input[] | undefined> {
        return undefined;
    }
}
