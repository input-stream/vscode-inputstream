import path = require('path');
import * as vscode from 'vscode';
import { types } from 'vscode-common';
import { formatTimestampISODate } from '../../common';
import { BuiltInCommands } from '../../constants';
import { User } from '../../proto/build/stack/auth/v1beta1/User';
import {
    Input,
    _build_stack_inputstream_v1beta1_Input_Type as InputType,
    _build_stack_inputstream_v1beta1_Input_Status as InputStatus
} from '../../proto/build/stack/inputstream/v1beta1/Input';
import { InputStreamClient } from '../client';
import { CommandName, ContextValue, getInputURI, Scheme, ThemeIconRss, ViewName } from '../constants';
import { InputStreamClientTreeDataProvider } from '../inputstreamclienttreedataprovider';

/**
 * Renders a view for a user pages.
 */
export class PageTreeView extends InputStreamClientTreeDataProvider<Input> {
    private items: Input[] | undefined;
    private currentInput: Input | undefined;

    constructor(
        private user: User,
        onDidInputStreamClientChange: vscode.Event<InputStreamClient>,
        onDidInputChange: vscode.Event<Input>,
        onDidInputCreate: vscode.Event<Input>,
        onDidInputRemove: vscode.Event<Input>,
    ) {
        super(ViewName.InputExplorer, onDidInputStreamClientChange);

        onDidInputChange(this.handleInputChange, this, this.disposables);
        onDidInputCreate(this.handleInputCreate, this, this.disposables);
        onDidInputRemove(this.handleInputRemove, this, this.disposables);

        this.view.onDidChangeVisibility(this.handleVisibilityChange, this, this.disposables);
    }

    registerCommands() {
        super.registerCommands();

        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputOpen, this.handleCommandInputOpen, this));
    }

    handleVisibilityChange(event: vscode.TreeViewVisibilityChangeEvent) {
        if (event.visible) {
            this.refresh();
        }
    }

    handleInputChange(input: Input) {
        this._onDidChangeTreeData.fire(input);
        const shouldRefresh = this.shouldRefreshInputList(input);
        this.currentInput = input;
        if (shouldRefresh) {
            this.refresh();
        }
    }

    handleInputCreate(input: Input) {
        this.refresh();
        this.items?.push(input);
    }

    handleInputRemove(input: Input) {
        this.refresh();
    }

    shouldRefreshInputList(input: Input): boolean {
        if (!this.currentInput) {
            return false;
        }
        if (this.currentInput.id !== input.id) {
            return false;
        }
        if (this.currentInput.title !== input.title) {
            return true;
        }
        if (this.currentInput.status !== input.status) {
            return true;
        }
        return false;
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
            const inputs = this.items = await this.client.listInputs({
                owner: this.user.login!,
            });
            if (!inputs) {
                return undefined;
            }
            return inputs;
        } catch (err) {
            console.log(`Could not list Inputs: ${err.message}`);
            return undefined;
        }
    }

    private async handleCommandInputOpen(input: Input | string): Promise<void> {
        if (types.isString(input)) {
            const id = path.basename(input as string);
            let foundItem = this.getInputById(id);
            if (!foundItem) {
                foundItem = await this.fetchInputById(id);
            }
            if (!foundItem) {
                return;
            }
            return this.handleCommandInputOpen(foundItem);
        }

        return vscode.commands.executeCommand(
            BuiltInCommands.Open, getInputURI(input));
    }

    private getInputById(id: string): Input | undefined {
        return this.items?.find(item => item.id === id);
    }

    private async fetchInputById(id: string): Promise<Input | undefined> {
        return this.client?.getInput({
            owner: this.user.login,
            id: id,
        });
    }
}

export class InputItem extends vscode.TreeItem {

    constructor(
        public input: Input,
        public label?: string,
        public parent?: InputItem,
    ) {
        super(label || `"${input.title!}"`);

        let when = formatTimestampISODate(input.createdAt);

        this.id = input.id;
        this.label = `${when}`;
        this.tooltip = `${when}: "${input.title}" (${input.id})`;
        this.contextValue = ContextValue.Input;
        this.iconPath = input.status === InputStatus.STATUS_PUBLISHED ? ThemeIconRss : undefined;
        this.description = `${input.title}`;
        this.command = {
            title: 'Open File',
            command: CommandName.InputOpen,
            arguments: [this.input],
        };
    }

    async getChildren(): Promise<Input[] | undefined> {
        return undefined;
    }
}
