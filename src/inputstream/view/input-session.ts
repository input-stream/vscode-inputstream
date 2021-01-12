import * as vscode from 'vscode';
import { Input } from '../../proto/build/stack/inputstream/v1beta1/Input';
import { PsClient } from '../client';
import { FieldMask } from '../../proto/google/protobuf/FieldMask';
import { InputContent } from '../../proto/build/stack/inputstream/v1beta1/InputContent';
import { ShortPostInputContent } from '../../proto/build/stack/inputstream/v1beta1/ShortPostInputContent';

/**
 * Handles updates for a single document editing session.
 */
export class InputSession implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];

    /**
     * @param input The input post.
     * @param uri The URI that represents the file being edited.
     */
    constructor(
        private client: PsClient,
        private input: Input,
        private uri: vscode.Uri,
        private onDidInputChange: vscode.EventEmitter<Input>,
    ) {
        vscode.workspace.onWillSaveTextDocument(
            this.handleTextDocumentWillSave, this, this.disposables);
    }

    async handleTextDocumentWillSave(e: vscode.TextDocumentWillSaveEvent): Promise<void> {
        if (e.document.uri.fsPath !== this.uri.fsPath) {
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
            const response = await this.client.updateInput(this.input, mask);
            if (response.input) {
                this.onDidInputChange.fire(response.input);
            }
            return response;
        } catch (err) {
            vscode.window.showErrorMessage(`Could not save input content: ${err.message}`);
        }
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables.length = 0;
    }
}
