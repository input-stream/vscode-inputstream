import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import { Duration } from 'luxon';
import { event } from 'vscode-common';

import { ImagesGrpcClient } from '../imagesClient';
import { ImageSearchPanel as ImageSearchWebview, ImageSearchRenderProvider, Message } from './webview';
import { ImageSearchRenderer } from './renderer';
import { SearchImage } from '../proto/build/stack/inputstream/v1beta1/SearchImage';
import { CommandName } from '../commands';
import { SearchImagesRequest } from '../proto/build/stack/inputstream/v1beta1/SearchImagesRequest';
import { UnsplashImage } from '../proto/build/stack/inputstream/v1beta1/UnsplashImage';
import { Context, VSCodeCommands, VSCodeWindow } from '../context';

/**
 * Controller component for image search.
 */
export class ImageSearch {
    protected webview: Promise<ImageSearchWebview>;
    protected renderer = new ImageSearchRenderer();
    protected onDidSearchImageClick = new vscode.EventEmitter<SearchImage>();

    /**
     * A mapping of images keyed by their ID.  This map is used as a lookup when
     * clicking on an image.
     */
    private imagesById = new Map<string, SearchImage>();

    constructor(
        ctx: Context,
        commands: VSCodeCommands,
        private window: VSCodeWindow,
        private client: ImagesGrpcClient,
    ) {
        ctx.add(this.onDidSearchImageClick);
        ctx.add(this.onDidSearchImageClick.event(this.handleCommandSearchImageClick, this));
        ctx.add(commands.registerCommand(CommandName.ImageSearch, this.handleCommandImageSearch, this));

        this.webview = new Promise<ImageSearchWebview>(() => {
            return new ImageSearchWebview(
                ctx,
                window,
                'Seach photos on using unsplash API',
                'Image Search',
                vscode.ViewColumn.Two,
            );
        });
    }

    async handleCommandSearchImageClick(image: SearchImage) {
        if (image.unsplash) {
            this.handleUnsplashImageClick(image.unsplash);
        }
    }

    async handleUnsplashImageClick(image: UnsplashImage) {
        const metadata = {
            id: image.id,
            type: 'unsplash',
            username: image.user?.username,
            firstname: image.user?.firstName,
            lastname: image.user?.lastName,
            height: image.height,
            width: image.width,
        };
        const md = JSON.stringify(metadata).slice(1, -1);
        const markdown = `![${md}](${image.regularUrl})`;

        this.copyToClipboard(markdown);
    }

    async insertTextInfoActiveTextEditor(text: string): Promise<void> {
        const editor = this.window.activeTextEditor;
        if (!editor) {
            this.window.showWarningMessage('Cannot insert image markdown (no active text editor)');
            return;
        }
        const position = editor.selection.active;
        await editor.edit(builder => {
            builder.insert(position, text);
        });
        editor.revealRange(new vscode.Range(position, position.translate(0, text.length)));
    }

    async copyToClipboard(text: string): Promise<void> {
        const d = vscode.window.setStatusBarMessage(
            `"${text}" copied to clipboard`,
            3000
        );
        await vscode.env.clipboard.writeText(text);
        d.dispose();
    }

    async handleCommandImageSearch() {
        this.searchImages();
    }

    async searchImages(): Promise<void> {
        const webview = await this.webview;
        const requestChangeEmitter = new event.Emitter<SearchImagesRequest>();

        const requestDidChange = event.Event.debounce(
            requestChangeEmitter.event,
            (last, e) => e,
            250,
            true,
        );

        requestDidChange(async (request) => {
            const webview = await this.webview;

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
            }, 10000);

            try {
                // Perform the search and clear the timeout set above.
                const response = await this.client.searchImages(request);
                clearTimeout(timeoutID);

                // Save the images
                this.imagesById.clear();
                response.image?.forEach(image => {
                    if (!image.unsplash?.id) {
                        return;
                    }
                    this.imagesById.set(image.unsplash.id, image);
                });

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
                    this.onDidSearchImageClick.fire(image);
                },
                'click.nextPage': (m: Message) => {
                    if (!m.data) {
                        return;
                    }
                    const nextPage = parseInt(m.data['page'], 10);
                    request.page = nextPage;
                    requestChangeEmitter.fire(request);
                }
            },
        });
    }
}
