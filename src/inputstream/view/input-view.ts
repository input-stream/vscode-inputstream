import * as grpc from '@grpc/grpc-js';
import Long = require('long');
import path = require('path');
import fs = require('fs');
import * as vscode from 'vscode';
import { event, objects, types } from 'vscode-common';
import { formatTimestampISODate } from '../../common';
import { InputStep, MultiStepInput } from '../../multiStepInput';
import { User } from '../../proto/build/stack/auth/v1beta1/User';
import { Input, _build_stack_inputstream_v1beta1_Input_Type as InputType } from '../../proto/build/stack/inputstream/v1beta1/Input';
import { PsClient } from '../client';
import { ButtonName, CommandName, ContextValue, ThemeIconFile, ViewName } from '../constants';
import { PsClientTreeDataProvider } from './psclienttreedataprovider';
import { BuiltInCommands } from '../../constants';
import { mkdirpSync } from 'fs-extra';
import { PsServerConfiguration } from '../configuration';
import { FieldMask } from '../../proto/google/protobuf/FieldMask';
import { InputContent } from '../../proto/build/stack/inputstream/v1beta1/InputContent';
import { ShortPostInputContent } from '../../proto/build/stack/inputstream/v1beta1/ShortPostInputContent';
import { ImageSearchPanel, ImageSearchRenderProvider, Message } from './webpanel';
import { Container } from '../../container';
import { SearchImagesRequest } from '../../proto/build/stack/inputstream/v1beta1/SearchImagesRequest';
import { Duration } from 'luxon';
import { ImageSearchRenderer } from './imagesearchrenderer';
import { SearchImage } from '../../proto/build/stack/inputstream/v1beta1/SearchImage';

/**
 * Renders a view for a users inputs.  Makes a call to the status
 * endpoint to gather the data.
 */
export class InputView extends PsClientTreeDataProvider<InputItem> {
    private items: InputItem[] | undefined;
    private sessions: Map<string, InputSession> = new Map();
    private currentInput: Input | undefined;
    private panel: ImageSearchPanel | undefined;
    private renderer = new ImageSearchRenderer();

    /**
     * A mapping of images keyed by their ID.  This map is used as a lookup when
     * clicking on an image.
     */
    private imagesById = new Map<string, SearchImage>();

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
            vscode.commands.registerCommand(CommandName.ImageSearch, this.handleCommandImageSearch, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.UpsertImageMarkdown, this.handleCommandUpsertSearchImageMarkdown, this));

        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputCreate, this.handleCommandInputCreate, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputLink, this.handleCommandInputLink, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.InputUpdate, this.handleCommandInputUpdate, this));
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
        console.log('input-view.getRootItems()');
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
            this.refresh();

            vscode.commands.executeCommand(CommandName.InputOpen, input?.id);
        } catch (err) {
            vscode.window.showErrorMessage(`Could not create Input: ${err.message}`);
            return undefined;
        }
    }


    async handleCommandInputUpdate(item: InputItem) {
        if (!this.client) {
            vscode.window.showWarningMessage('could not update Input (client not connected)');
            return;
        }
        if (!this.user) {
            vscode.window.showWarningMessage('could not updated Input (user not logged in)');
            return;
        }
        try {
            let input: Input = objects.deepClone(item.input);
            let mask: FieldMask = {
                paths: [],
            };

            const setImageUrl: InputStep = async (msi) => {
                const value = await msi.showInputBox({
                    title: 'Image',
                    totalSteps: 3,
                    step: 3,
                    value: input.imageUrl || '',
                    prompt: 'Choose a header image for your article',
                    validate: async (value: string) => {
                        if (!value.startsWith('https://')) {
                            return 'URL must start with "https://"';
                        }
                        return '';
                    },
                    shouldResume: async () => false,
                });
                if (value && input.imageUrl !== value) {
                    input.imageUrl = value;
                    mask.paths!.push('image_url');
                }
                return undefined;
            };

            const setAbstract: InputStep = async (msi) => {
                const value = await msi.showInputBox({
                    title: 'Subtitle',
                    totalSteps: 3,
                    step: 2,
                    value: input.abstract || '',
                    prompt: 'Choose a subtitle',
                    validate: async (value: string) => { return ''; },
                    shouldResume: async () => false,
                });
                if (value && input.abstract !== value) {
                    input.abstract = value;
                    mask.paths!.push('abstract');
                }
                return setImageUrl;
            };

            const setTitle: InputStep = async (msi) => {
                const value = await msi.showInputBox({
                    title: 'Title',
                    totalSteps: 3,
                    step: 1,
                    value: input.title || '',
                    prompt: 'Choose a title (you can always change it later)',
                    validate: async (value: string) => { return ''; },
                    shouldResume: async () => false,
                });
                if (value && input.title !== value) {
                    input.title = value;
                    mask.paths!.push('title');
                }
                return setAbstract;
            };

            await MultiStepInput.run(setTitle);

            if (!mask.paths?.length) {
                return;
            }

            await this.client.updateInput(input, mask);
            this.refresh();

        } catch (err) {
            vscode.window.showErrorMessage(`Could not create Input: ${err.message}`);
            return undefined;
        }
    }

    async handleCommandInputLink(item: InputItem) {
        // EXPERIMENT:
        // const uri = await vscode.env.asExternalUri(vscode.Uri.parse(`${vscode.env.uriScheme}://${ExtensionID}/${item.input.login}/${item.input.id}`));
        // return vscode.env.openExternal(uri);
        return this.openLink(item.input);
    }

    async openLink(input: Input, watch = false) {
        let u = `${this.cfg.baseURL}/@${input.login}/${input.id}`;
        if (watch) {
            u += '/view/watch';
        }
        const uri = vscode.Uri.parse(u);
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
                this.openLink(input, true);
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

    getOrCreateSearchPanel(queryExpression: string): ImageSearchPanel {
        if (!this.panel) {
            this.panel = new ImageSearchPanel(
                Container.context.extensionPath,
                'Image Search',
                `Imagesearch ${queryExpression}`,
                vscode.ViewColumn.Two);

            this.panel.onDidDispose(() => {
                this.panel = undefined;
            }, this, this.disposables);
        }
        return this.panel;
    }

    async handleCommandUpsertSearchImageMarkdown(image: SearchImage) {
        if (!image) {
            return;
        }

        // current editor
        // const editor = vscode.window.activeTextEditor;
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Cannot insert image markdown (no active text editor)');
            return;
        }
        const position = editor.selection.active;
        const markdown = `![${image.user?.username}](${image.url})`;
        await editor.edit(builder => {
            builder.insert(position, markdown);
        });
        editor.revealRange(new vscode.Range(position, position.translate(0, markdown.length)));
    }

    async handleCommandImageSearch() {
        this.searchImages('');
    }

    async searchImages(queryExpression: string): Promise<void> {

        const panel = this.getOrCreateSearchPanel(queryExpression);

        const requestChangeEmitter = new event.Emitter<SearchImagesRequest>();

        const requestDidChange = event.Event.debounce(
            requestChangeEmitter.event,
            (last, e) => e,
            250,
            true,
        );

        requestDidChange(async (request) => {
            if (!this.client) {
                return;
            }
            if (!request.query) {
                return;
            }
            const start = Date.now();

            if (!request) {
                panel.onDidChangeHTMLSummary.fire('Searching ' + queryExpression);
                panel.onDidChangeHTMLResults.fire('');
                return;
            }

            panel.onDidChangeHTMLSummary.fire('Working...');
            panel.onDidChangeHTMLResults.fire('<progress></progress>');
            const timeoutID = setTimeout(() => {
                panel.onDidChangeHTMLSummary.fire('Timed out.');
                panel.onDidChangeHTMLResults.fire('');
            }, 1000);

            try {
                // Perform the search and clear the timeout set above.
                const response = await this.client.searchImages(request);
                clearTimeout(timeoutID);

                // Save the images
                response.image?.forEach(
                    image => this.imagesById.set(image.id!, image));

                // Update summary
                panel.onDidChangeHTMLSummary.fire('Rendering results...');

                // Render HTML and update event emitters.
                const resultsHTML = await this.renderer.renderResults(response);
                let summaryHTML = await this.renderer.renderSummary(request, response);
                const dur = Duration.fromMillis(Date.now() - start);
                summaryHTML += ` [${dur.milliseconds} ms]`;
                panel.onDidChangeHTMLSummary.fire(summaryHTML);
                panel.onDidChangeHTMLResults.fire(resultsHTML);
            } catch (e) {
                clearTimeout(timeoutID);
                const err = e as grpc.ServiceError;
                panel.onDidChangeHTMLSummary.fire(err.message);
                panel.onDidChangeHTMLResults.fire('');
            }
        });

        await this.renderSearchPanel({}, panel, requestChangeEmitter);

        panel.onDidChangeHTMLSummary.fire('Searching ' + queryExpression);
    }

    async renderSearchPanel(request: SearchImagesRequest, panel: ImageSearchRenderProvider, requestChangeEmitter: vscode.EventEmitter<SearchImagesRequest>): Promise<void> {
        return panel.render({
            form: {
                name: 'search',
                inputs: [
                    {
                        label: 'Query',
                        type: 'text',
                        name: 'number',
                        placeholder: 'Search expression',
                        display: 'inline-block',
                        size: 15,
                        autofocus: true,
                        style: 'width: 20rem',
                        onchange: async (value: string) => {
                            if (!value || value.length < 3) {
                                request.query = '';
                                requestChangeEmitter.fire(request);
                                return;
                            }
                            request.query = value;
                            requestChangeEmitter.fire(request);
                            return '';
                        },
                    },
                    {
                        label: 'Page',
                        type: 'number',
                        name: 'page',
                        value: '1',
                        display: 'inline-block',
                        size: 3,
                        style: 'width: 8rem',
                        onchange: async (value: string) => {
                            if (!value) {
                                return;
                            }
                            request.page = parseInt(value, 10);
                            requestChangeEmitter.fire(request);
                            return '';
                        },
                    },
                ]
            },
            callbacks: {
                'click.image': (m: Message) => {
                    if (!m.data) {
                        return;
                    }
                    const id = m.data['id'];
                    const image = this.imagesById.get(id);
                    if (!image) {
                        return;
                    }
                    vscode.commands.executeCommand(CommandName.UpsertImageMarkdown, image);
                }
            },
        });
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
        this.iconPath = ThemeIconFile;
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

/**
 * Handles updates for a single document editing session.
 */
class InputSession implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];

    /**
     * @param input The input post.
     * @param uri The URI that represents the file being edited.
     */
    constructor(
        private client: PsClient,
        private input: Input,
        private uri: vscode.Uri,
    ) {
        vscode.workspace.onWillSaveTextDocument(
            this.handleTextDocumentWillSave, this, this.disposables);
    }

    async handleTextDocumentWillSave(e: vscode.TextDocumentWillSaveEvent): Promise<void> {
        if (e.document.uri !== this.uri) {
            return;
        }
        e.waitUntil(this.save(e.document.getText()));
    }

    async save(text: string): Promise<any> {
        const short: ShortPostInputContent = {
            markdown: text,
        };
        const content: InputContent = {
            value: 'shortPost',
            shortPost: short,
        };
        this.input.content = content;
        const mask: FieldMask = {
            paths: ['content'],
        };

        try {
            return this.client.updateInput(this.input, mask);
        } catch (err) {
            vscode.window.showErrorMessage(`Could not save input content: ${err.message}`);
        }
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables.length = 0;
    }
}

function getContentSource(content: InputContent): string {
    if (content.shortPost) {
        return content.shortPost.markdown || '';
    }
    return '';
}
