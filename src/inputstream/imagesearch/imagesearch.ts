import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import { event } from 'vscode-common';
import { PsClient } from '../client';
import { CommandName } from '../constants';
import { ImageSearchPanel as ImageSearchWebview, ImageSearchRenderProvider, Message } from './webview';
import { Container } from '../../container';
import { SearchImagesRequest } from '../../proto/build/stack/inputstream/v1beta1/SearchImagesRequest';
import { Duration } from 'luxon';
import { ImageSearchRenderer } from './renderer';
import { SearchImage } from '../../proto/build/stack/inputstream/v1beta1/SearchImage';

/**
 * Controller component for image search.
 */
export class ImageSearch implements vscode.Disposable {
    protected disposables: vscode.Disposable[] = [];
    protected client: PsClient | undefined;
    protected webview: ImageSearchWebview | undefined;
    protected renderer = new ImageSearchRenderer();

    /**
     * A mapping of images keyed by their ID.  This map is used as a lookup when
     * clicking on an image.
     */
    private imagesById = new Map<string, SearchImage>();

    constructor(
        onDidPsClientChange: vscode.Event<PsClient>,
    ) {
        onDidPsClientChange(this.handlePsClientChange, this, this.disposables);

        this.disposables.push(
            vscode.commands.registerCommand(CommandName.ImageSearch, this.handleCommandImageSearch, this));
        this.disposables.push(
            vscode.commands.registerCommand(CommandName.UpsertImageMarkdown, this.handleCommandUpsertSearchImageMarkdown, this));
    }

    handlePsClientChange(client: PsClient) {
        this.client = client;
    }

    getOrCreateWebview(): ImageSearchWebview {
        if (!this.webview) {
            this.webview = this.createWebview();
        }
        return this.webview;
    }

    createWebview(): ImageSearchWebview {
        const webview = new ImageSearchWebview(
            Container.context.extensionPath,
            'Image Search',
            'Image Search',
            vscode.ViewColumn.Two);

        webview.onDidDispose(() => {
            this.webview = undefined;
        }, this, this.disposables);

        return webview;
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

        const webview = this.getOrCreateWebview();

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
                webview.onDidChangeHTMLSummary.fire('');
                webview.onDidChangeHTMLResults.fire('');
                return;
            }

            webview.onDidChangeHTMLSummary.fire('Working...');
            webview.onDidChangeHTMLResults.fire('<progress></progress>');
            const timeoutID = setTimeout(() => {
                webview.onDidChangeHTMLSummary.fire('Timed out.');
                webview.onDidChangeHTMLResults.fire('');
            }, 1000);

            try {
                // Perform the search and clear the timeout set above.
                const response = await this.client.searchImages(request);
                clearTimeout(timeoutID);

                // Save the images
                response.image?.forEach(
                    image => this.imagesById.set(image.id!, image));

                // Update summary
                webview.onDidChangeHTMLSummary.fire('Rendering results...');

                // Render HTML and update event emitters.
                const resultsHTML = await this.renderer.renderResults(response);
                let summaryHTML = await this.renderer.renderSummary(request, response);
                const dur = Duration.fromMillis(Date.now() - start);
                summaryHTML += ` [${dur.milliseconds} ms]`;
                webview.onDidChangeHTMLSummary.fire(summaryHTML);
                webview.onDidChangeHTMLResults.fire(resultsHTML);
            } catch (e) {
                clearTimeout(timeoutID);
                const err = e as grpc.ServiceError;
                webview.onDidChangeHTMLSummary.fire(err.message);
                webview.onDidChangeHTMLResults.fire('');
            }
        });

        await this.renderWebview({}, webview, requestChangeEmitter);

        webview.onDidChangeHTMLSummary.fire('Searching ' + queryExpression);
    }

    async renderWebview(request: SearchImagesRequest, panel: ImageSearchRenderProvider, requestChangeEmitter: vscode.EventEmitter<SearchImagesRequest>): Promise<void> {
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

    public dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables.length = 0;
    }
}
