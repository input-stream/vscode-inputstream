import * as vscode from 'vscode';
import { formatTimestampISODate } from '../../common';
import { InputStep, MultiStepInput } from '../../multiStepInput';
import { BuiltInCommands } from '../../constants';
import {
    Input,
    _build_stack_inputstream_v1beta1_Input_Type as InputType,
    _build_stack_inputstream_v1beta1_Input_Status as InputStatus
} from '../../proto/build/stack/inputstream/v1beta1/Input';
import { InputStreamClient } from '../inputStreamClient';
import { ButtonName, CommandName, getInputURI, isInput } from '../constants';
import { PageFileSystemProvider } from './filesystem';
import { User } from '../../proto/build/stack/auth/v1beta1/User';
import { BytesClient } from '../byteStreamClient';

/**
 * Controller for page commands.
 */
export class PageController implements vscode.Disposable {
    protected disposables: vscode.Disposable[] = [];
    protected client: InputStreamClient | undefined;
    protected fs: PageFileSystemProvider;

    constructor(
        private user: User,
        onDidInputStreamClientChange: vscode.EventEmitter<InputStreamClient>,
        onDidByteStreamClientChange: vscode.EventEmitter<BytesClient>,
        private onDidInputChange: vscode.EventEmitter<Input>,
        private onDidInputCreate: vscode.EventEmitter<Input>,
        private onDidInputRemove: vscode.EventEmitter<Input>,
    ) {
        onDidInputStreamClientChange.event(this.handleInputStreamClientChange, this, this.disposables);

        this.fs = new PageFileSystemProvider(
            onDidInputStreamClientChange.event,
            onDidByteStreamClientChange.event,
            onDidInputChange);
        this.disposables.push(this.fs);

        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputCreate, this.handleCommandInputCreate, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputRemove, this.handleCommandInputRemove, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputLink, this.handleCommandInputLink, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputPublish, this.handleCommandInputPublish, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputUnpublish, this.handleCommandInputUnpublish, this));
    }

    public filesystem(): vscode.FileSystem {
        return this.fs.filesystem();
    }

    private handleInputStreamClientChange(client: InputStreamClient) {
        this.client = client;
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
            const request: Input = {
                status: 'STATUS_DRAFT',
                owner: this.user.login,
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
            this.onDidInputCreate.fire(input);
            vscode.commands.executeCommand(CommandName.InputOpen, input.id);
        } catch (err) {
            if (err instanceof Error) {
                vscode.window.showErrorMessage(`Could not create Input: ${err.message}`);
            }
            return undefined;
        }
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

        try {
            await this.client?.removeInput(input.id!);
            this.onDidInputRemove.fire(input);
        } catch (err) {
            if (err instanceof Error) {
                vscode.window.showErrorMessage(`Could not create Input: ${err.message}`);
            }
            return undefined;
        }
    }

    async handleCommandInputPublish(uri: vscode.Uri): Promise<void> {
        const file = await this.fs.getFile(uri);
        this.updateInputStatus(file.input, InputStatus.STATUS_PUBLISHED);
    }

    async handleCommandInputUnpublish(uri: vscode.Uri): Promise<void> {
        const file = await this.fs.getFile(uri);
        this.updateInputStatus(file.input, InputStatus.STATUS_DRAFT);
    }

    async handleCommandInputLink(inputOrUri: vscode.Uri | Input) {
        if (isInput(inputOrUri)) {
            this.handleCommandInputLink(getInputURI(inputOrUri as Input));
        }
        const file = await this.fs.getFile(inputOrUri as vscode.Uri);
        return this.openHtmlUrl(file.input);
    }

    async openHtmlUrl(input: Input, watch = true) {
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

    async updateInputStatus(input: Input, status: InputStatus) {
        input.status = status;

        try {
            const response = await this.client?.updateInput(input, {
                paths: ['status'],
            });
            if (response?.input) {
                this.onDidInputChange.fire(response.input);
            }
        } catch (err) {
            if (err instanceof Error) {
                vscode.window.showErrorMessage(`Could not update input: ${err.message}`);
            }
        }
    }

    public dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
    }

}
