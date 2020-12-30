import Long = require('long');
import path = require('path');
import fs = require('fs');
import * as vscode from 'vscode';
import { objects, types } from 'vscode-common';
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
export class InputView extends PsClientTreeDataProvider<InputItem> {
    private items: InputItem[] | undefined;
    private sessions: Map<string, InputSession> = new Map();
    private currentInput: Input | undefined;

    constructor(
        private cfg: PsServerConfiguration,
        private user: User,
        client: PsClient | undefined,
        onDidPsClientChange: vscode.Event<PsClient>,
        private onDidInputChange: vscode.EventEmitter<Input>,
    ) {
        super(ViewName.InputExplorer, onDidPsClientChange);

        this.client = client;

        this.disposables.push(this.onDidChangeTreeData(() => {
            if (this.currentInput) {
                const item = this.getInputItemById(this.currentInput.id!);
                if (item) {
                    this.view.reveal(item);
                }
            }
        }));

        this.view.onDidChangeVisibility(this.handleVisibilityChange, this, this.disposables);
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

    async handleCommandInputOpen(item: InputItem | string): Promise<void> {
        if (types.isString(item)) {
            const id = path.basename(item as string);
            const foundItem = this.getInputItemById(id);
            if (!foundItem) {
                return;
            }
            return this.handleCommandInputOpen(foundItem);
        }

        item = item as InputItem;
        this.view.reveal(item);
        this.onDidInputChange.fire(item.input);

        const filename = path.join(
            this.cfg.baseDir,
            item.input.login!,
            item.input.id!,
            'main.md');
        const uri = vscode.Uri.file(filename);
        const dirname = path.dirname(filename);

        const mask: FieldMask = {
            paths: ['content'],
        };

        try {
            const current = await this.client!.getInput(item.input.login!, item.input.id!, mask);
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
            };

            const setTitle: InputStep = async (msi) => {
                const title = await msi.showInputBox({
                    title: 'Title',
                    totalSteps: 2,
                    step: 2,
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

            const pickType: InputStep = async (input) => {
                const picked = await input.showQuickPick({
                    title: 'Input Type',
                    totalSteps: 2,
                    step: 1,
                    items: [{
                        label: 'Short Post',
                        type: InputType.TYPE_SHORT_POST,
                    }],
                    placeholder: 'Choose input type',
                    shouldResume: async () => false,
                });
                request.type = (picked as InputTypeQuickPickItem).type;
                return setTitle;
            };

            await MultiStepInput.run(pickType);

            const input = await this.client.createInput(request);
            if (!input) {
                return;
            }
            const item = new InputItem(input);
            this.items?.push(item);
            vscode.commands.executeCommand(CommandName.InputOpen, input?.id);
        } catch (err) {
            vscode.window.showErrorMessage(`Could not create Input: ${err.message}`);
            return undefined;
        }
    }

    async handleCommandInputLink(item: InputItem) {
        return this.openHtmlUrl(item.input);
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

    async handleCommandInputRemove(item: InputItem) {
        const title = item.input.title;
        const when = formatTimestampISODate(item.input.createdAt);
        const action = await vscode.window.showInformationMessage(
            `Are you sure you want to remove draft "${title}" (${when})`,
            ButtonName.Confirm, ButtonName.Cancel);
        if (action !== ButtonName.Confirm) {
            return;
        }

        // TODO: close this
        // const session = this.sessions.get(item.input.id!);
        // if (session) {
        //     session.close();
        // }

        try {
            const input = await this.client?.removeInput(item.input.login!, item.input.id!);
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

        const item = this.getInputForDocumentURI(doc.uri);
        if (!item) {
            return;
        }

        this.ensureInputSession(this.client, item.input, doc.uri);
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
        const item = this.getInputForDocumentURI(doc.uri);
        if (!item) {
            return;
        }

        this.ensureInputSession(this.client, item.input, doc.uri);
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

            session = new InputSession(client, input, uri);
            this.sessions.set(uri.fsPath, session);
        }
        return session;
    }

    getInputForDocumentURI(uri: vscode.Uri): InputItem | undefined {
        const inputDir = path.dirname(uri.fsPath);
        const item = this.getInputItemById(path.basename(inputDir));
        if (!item) {
            return;
        }
        const userDir = path.dirname(inputDir);
        if (item.input.login !== path.basename(userDir)) {
            return;
        }
        const baseDir = path.dirname(userDir);
        if (baseDir !== this.cfg.baseDir) {
            return;
        }
        return item;
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

    getInputItemById(id: string): InputItem | undefined {
        return this.items?.find(item => item.input.id === id);
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
