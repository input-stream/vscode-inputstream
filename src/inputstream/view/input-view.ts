import Long = require('long');
import path = require('path');
import fs = require('fs');
import * as vscode from 'vscode';
import { types } from 'vscode-common';
import { formatTimestampISODate } from '../../common';
import { InputStep, MultiStepInput } from '../../multiStepInput';
import { User } from '../../proto/build/stack/auth/v1beta1/User';
import { Input, _build_stack_inputstream_v1beta1_Input_Type as InputType, _build_stack_inputstream_v1beta1_Input_Status as InputStatus } from '../../proto/build/stack/inputstream/v1beta1/Input';
import { PsClient } from '../client';
import { ButtonName, CommandName, ContextValue, ThemeIconRss, ViewName } from '../constants';
import { PsClientTreeDataProvider } from './psclienttreedataprovider';
import { BuiltInCommands } from '../../constants';
import { mkdirpSync } from 'fs-extra';
import { PsServerConfiguration } from '../configuration';
import { FieldMask } from '../../proto/google/protobuf/FieldMask';
import { InputContent } from '../../proto/build/stack/inputstream/v1beta1/InputContent';
import { InputSession } from './input-session';

/**
 * Renders a view for a users inputs.  Makes a call to the status
 * endpoint to gather the data.
 */
export class InputView extends PsClientTreeDataProvider<Input> {
    private items: Input[] | undefined;
    private sessions: Map<string, InputSession> = new Map();
    private currentInput: Input | undefined;
    
    constructor(
        onDidPsClientChange: vscode.Event<PsClient>,
        private cfg: PsServerConfiguration,
        private user: User,
        private onDidInputChange: vscode.EventEmitter<Input>,
    ) {
        super(ViewName.InputExplorer, onDidPsClientChange);

        this.disposables.push(this.onDidChangeTreeData(() => {
            if (this.currentInput) {
                const item = this.getInputById(this.currentInput.id!);
                if (item) {
                    this.view.reveal(item);
                }
            }
        }));

        this.view.onDidChangeVisibility(this.handleVisibilityChange, this, this.disposables);

        onDidInputChange.event(this.handleInputChange, this, this.disposables);
    }

    registerCommands() {
        super.registerCommands();

        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputCreate, this.handleCommandInputCreate, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputLink, this.handleCommandInputLink, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputRemove, this.handleCommandInputRemove, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputOpen, this.handleCommandInputOpen, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputPublish, this.handleCommandInputPublish, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputUnpublish, this.handleCommandInputUnpublish, this));

        vscode.workspace.onDidOpenTextDocument(
            this.handleTextDocumentOpen, this, this.disposables);
        vscode.workspace.onDidCloseTextDocument(
            this.handleTextDocumentClose, this, this.disposables);
        vscode.workspace.onDidChangeTextDocument(
            this.handleTextDocumentChange, this, this.disposables);
    }

    handleVisibilityChange(event: vscode.TreeViewVisibilityChangeEvent) {
        if (event.visible) {
            this.refresh();
        }
        // vscode.window.showInformationMessage(`input tree view visible? ${event.visible}`);
    }

    handleInputChange(input: Input) {
        this._onDidChangeTreeData.fire(input);
        this.currentInput = input;
        this.refresh();
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
                login: this.user.login!,
            });
            if (!inputs) {
                return undefined;
            }
            sortInputsByCreateTime(inputs);
            return inputs;
        } catch (err) {
            console.log(`Could not list Inputs: ${err.message}`);
            return undefined;
        }
    }

    async handleCommandInputPublish(input: Input): Promise<void> {
        this.updateInputStatus(input, InputStatus.STATUS_PUBLISHED);
    }

    async handleCommandInputUnpublish(input: Input): Promise<void> {
        this.updateInputStatus(input, InputStatus.STATUS_DRAFT);
    }
    
    async updateInputStatus(input: Input, status: InputStatus) {
        input.status = status;

        const mask: FieldMask = {
            paths: ['status'],
        };

        try {
            const response = await this.client?.updateInput(input, mask);
            if (response?.input) {
                this.onDidInputChange.fire(response.input);
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Could not update input: ${err.message}`);
        }
    }

    async handleCommandInputOpen(input: Input | string): Promise<void> {
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

        this.view.reveal(input);
        this.onDidInputChange.fire(input);

        const filename = path.join(
            this.cfg.baseDir,
            input.login!,
            input.id!,
            'main.md');
        const uri = vscode.Uri.file(filename);
        const dirname = path.dirname(filename);

        const mask: FieldMask = {
            paths: ['content'],
        };

        try {
            const current = await this.client!.getInput({ login: input.login!, id: input.id! }, mask);
            if (!current) {
                return;
            }
            if (!current.content) {
                return;
            }
            const markdown = getContentSource(current.content);

            mkdirpSync(dirname);
            fs.writeFileSync(uri.fsPath, markdown);
            return vscode.commands.executeCommand(BuiltInCommands.Open, uri);

        } catch (err) {
            vscode.window.showErrorMessage(`could not open ${uri.fsPath}: ${err.message}`);
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
            let request: Input = {
                status: 'STATUS_DRAFT',
                login: this.user.login,
                type: InputType.TYPE_SHORT_POST,
            };

            const setTitle: InputStep = async (msi) => {
                const title = await msi.showInputBox({
                    title: 'Title',
                    totalSteps: 1,
                    step: 1,
                    value: '',
                    prompt: 'Choose a title (you can always change it later)',
                    validate: async (value: string) => { return ''; },
                    shouldResume: async () => false,
                });
                if (title) {
                    request.title = title;
                }
                return undefined;
            };

            // Uncomment when we have more than one type of input.
            //
            // const pickType: InputStep = async (input) => {
            //     const picked = await input.showQuickPick({
            //         title: 'Input Type',
            //         totalSteps: 2,
            //         step: 1,
            //         items: [{
            //             label: 'Page',
            //             type: InputType.TYPE_SHORT_POST,
            //         }],
            //         placeholder: 'Choose input type',
            //         shouldResume: async () => false,
            //     });
            //     request.type = (picked as InputTypeQuickPickItem).type;
            //     return setTitle;
            // };

            await MultiStepInput.run(setTitle);
            if (!request.title) {
                return;
            }
            const input = await this.client.createInput(request);
            if (!input) {
                return;
            }
            this.refresh();
            this.items?.push(input);
            vscode.commands.executeCommand(CommandName.InputOpen, input.id);
        } catch (err) {
            vscode.window.showErrorMessage(`Could not create Input: ${err.message}`);
            return undefined;
        }
    }

    async handleCommandInputLink(input: Input) {
        return this.openHtmlUrl(input);
    }

    async openHtmlUrl(input: Input, watch = false) {
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

    async handleCommandInputRemove(input: Input) {
        const title = input.title;
        const when = formatTimestampISODate(input.createdAt);
        const action = await vscode.window.showInformationMessage(
            `Are you sure you want to remove "${title}" (${when})`,
            ButtonName.Confirm, ButtonName.Cancel);
        if (action !== ButtonName.Confirm) {
            return;
        }

        const session = this.sessions.get(input.id!);
        if (session) {
            this.sessions.delete(input.id!);
            session.dispose();
        }

        try {
            await this.client?.removeInput(input.login!, input.id!);
            this.refresh();
            vscode.window.showInformationMessage(`Removed draft "${title}" (${when})`);
        } catch (err) {
            vscode.window.showErrorMessage(`Could not create Input: ${err.message}`);
            return undefined;
        }
    }

    handleTextDocumentOpen(doc: vscode.TextDocument) {
        if (!this.client) {
            return;
        }

        const input = this.getInputForDocumentURI(doc.uri);
        if (!input) {
            return;
        }

        this.ensureInputSession(this.client, input, doc.uri);
    }

    /**
     * handleTextDocumentChange monitors edits and checks that we have on
     * ongoing session for docs whose tabs are open.
     * @param event 
     */
    handleTextDocumentChange(event: vscode.TextDocumentChangeEvent) {
        if (!this.client) {
            return;
        }
        const doc = event.document;
        const input = this.getInputForDocumentURI(doc.uri);
        if (!input) {
            return;
        }

        this.ensureInputSession(this.client, input, doc.uri);
    }

    async ensureInputSession(client: PsClient, input: Input, uri: vscode.Uri): Promise<InputSession> {
        let session = this.sessions.get(uri.fsPath);
        if (!session) {
            const action = await vscode.window.showInformationMessage(
                `Editing "${input.title}"`,
                ButtonName.Watch);
            if (action === ButtonName.Watch) {
                this.openHtmlUrl(input, true);
            }

            session = new InputSession(client, input, uri, this.onDidInputChange);
            this.sessions.set(uri.fsPath, session);
        }
        return session;
    }

    getInputForDocumentURI(uri: vscode.Uri): Input | undefined {
        const inputDir = path.dirname(uri.fsPath);
        const input = this.getInputById(path.basename(inputDir));
        if (!input) {
            return;
        }
        const userDir = path.dirname(inputDir);
        if (input.login !== path.basename(userDir)) {
            return;
        }
        const baseDir = path.dirname(userDir);
        if (baseDir !== this.cfg.baseDir) {
            return;
        }
        return input;
    }

    handleTextDocumentClose(doc: vscode.TextDocument) {
        const session = this.sessions.get(doc.uri.fsPath);
        if (!session) {
            return;
        }
        session.dispose();
        this.sessions.delete(doc.uri.fsPath);
        console.log(`closed doc: ${doc.uri.fsPath}`);
    }

    getInputById(id: string): Input | undefined {
        return this.items?.find(item => item.id === id);
    }

    async fetchInputById(id: string): Promise<Input | undefined> {
        return this.client?.getInput({
            login: this.user.login,
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
        this.id = input.id;
        let when = formatTimestampISODate(input.createdAt);
        // TODO(pcj): restore type name once there are choices about it, until
        // then it's just confusing.
        // let type = getInputTypeName(input.type as InputType); // FIXME: why necessary?
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

function getInputTypeName(type: InputType | undefined): string {
    switch (type) {
        case InputType.TYPE_ANY: return 'any';
        case InputType.TYPE_SHORT_POST: return 'short';
        case InputType.TYPE_LONG_POST: return 'long';
        case InputType.TYPE_IMAGE: return 'image';
        default: return 'unknown';
    }
}

interface InputTypeQuickPickItem extends vscode.QuickPickItem {
    type: InputType
}

function getContentSource(content: InputContent): string {
    if (content.shortPost) {
        return content.shortPost.markdown || '';
    }
    return '';
}
