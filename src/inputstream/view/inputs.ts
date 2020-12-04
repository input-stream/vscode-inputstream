import Long = require('long');
import * as luxon from 'luxon';
import * as vscode from 'vscode';
import { formatTimestampISODate } from '../../common';
import { User } from '../../proto/build/stack/auth/v1beta1/User';
import { Input } from '../../proto/build/stack/inputstream/v1beta1/Input';
import { PsClient } from '../client';
import { ButtonName, CommandName, ContextValue, ThemeIconFile, ViewName } from '../constants';
import { PsClientTreeDataProvider } from './psclienttreedataprovider';

/**
 * Renders a view for bezel license status.  Makes a call to the status
 * endpoint to gather the data.
 */
export class InputsView extends PsClientTreeDataProvider<InputItem> {
    private items: InputItem[] | undefined;
    private user: User | undefined;
    // currently selected Input
    private currentInput: Input | undefined;

    constructor(
        onDidChangePsClientChange: vscode.Event<PsClient>,
        onDidAuthUserChange: vscode.Event<User>,
        onDidInputChange: vscode.EventEmitter<Input>,
    ) {
        super(ViewName.InputExplorer, onDidChangePsClientChange);

        onDidAuthUserChange(user => {
            this.user = user;
            this.clear();
        }, this, this.disposables);

        this.disposables.push(this.onDidChangeTreeData(() => {
            if (this.currentInput) {
                const item = this.getInputItemById(this.currentInput.id!);
                if (item) {
                    this.view.reveal(item);
                }
            }
        }));
        this.disposables.push(vscode.commands.registerCommand(CommandName.InputOpen, (item: InputItem) => {
            this.view.reveal(item);
            onDidInputChange.fire(item.input);
        }));
    }

    registerCommands() {
        super.registerCommands();

        this.disposables.push(vscode.commands.registerCommand(CommandName.InputCreate, this.handleCommandInputCreate, this));
        this.disposables.push(vscode.commands.registerCommand(CommandName.InputRemove, this.handleCommandInputRemove, this));
    }

    getTreeItem(element: InputItem): vscode.TreeItem {
        return element;
    }

    public async getParent(node?: InputItem): Promise<InputItem | undefined> {
        if (!node) {
            return undefined;
        }
        return node.parent;
    }

    async getRootItems(): Promise<InputItem[] | undefined> {
        if (!this.client) {
            return undefined;
        }
        if (!this.user) {
            return undefined;
        }
        try {
            const inputs = await this.client.listInputs(this.user.login!);
            if (!inputs) {
                return undefined;
            }
            sortInputsByCreateTime(inputs);
            return this.items = inputs.map(input => new InputItem(input));
        } catch (err) {
            console.log(`Could not list Inputs: ${err.message}`);
            return undefined;
        }
    }

    async handleCommandInputCreate() {
        if (!this.client) {
            vscode.window.showWarningMessage('could not create Input (client not connected)');
            return;
        }
        if (!this.user) {
            vscode.window.showWarningMessage('could not create Input (user not logged in)');
            return;
        }
        try {
            const input = await this.client.createInput(this.user.login!);
            this.refresh();
            vscode.commands.executeCommand(CommandName.InputOpen, input);
        } catch (err) {
            vscode.window.showErrorMessage(`Could not create Input: ${err.message}`);
            return undefined;
        }
    }

    async handleCommandInputRemove(item: InputItem) {
        const title = item.input.title;
        const when = formatTimestampISODate(item.input.createdAt);
        const action = await vscode.window.showInformationMessage(
            `Are you sure you want to remove draft "${title}" (${when})`,
            ButtonName.Confirm, ButtonName.Cancel);
        if (action !== ButtonName.Confirm) {
            return;
        }
        try {
            const input = await this.client?.removeInput(item.input.login!, item.input.id!);
            this.refresh();
            vscode.window.showInformationMessage(`Removed draft "${title}" (${when})`);
        } catch (err) {
            vscode.window.showErrorMessage(`Could not create Input: ${err.message}`);
            return undefined;
        }
    }

    getInputItemById(id: string): InputItem | undefined {
        return this.items?.find(item => item.id === id);
    }
}

export class InputItem extends vscode.TreeItem {

    constructor(
        public readonly input: Input,
        public label?: string,
        public parent?: InputItem,
    ) {
        super(label || `"${input.title!}"`);

        let when = formatTimestampISODate(input.createdAt);

        this.label = when;
        this.tooltip = `${when}: "${input.title}" (${input.id})`;
        this.contextValue = ContextValue.Input;
        this.iconPath = ThemeIconFile;
        this.description = input.title;
        this.command = {
            title: 'Open File',
            command: CommandName.InputOpen,
            arguments: [this],
        };
    }

    async getChildren(): Promise<InputItem[] | undefined> {
        return undefined;
    }
}

/**
 * Sort the Inputs by creation time with most recent Inputs in front.
 * Array modified in place.
 * @param inputs 
 */
function sortInputsByCreateTime(inputs: Input[]) {
    inputs?.sort((a, b) => {
        const tb = Long.fromValue(b.createdAt!.seconds!).toNumber();
        const ta = Long.fromValue(a.createdAt!.seconds!).toNumber();
        return tb - ta;
    });
}