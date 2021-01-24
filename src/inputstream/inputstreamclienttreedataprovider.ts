import * as vscode from 'vscode';
import { InputStreamClient } from './client';
import { TreeDataProvider } from './treedataprovider';

/**
 * Base class for a view that interacts with a gRPC endpoint and produces tree
 * output.
 */
export abstract class InputStreamClientTreeDataProvider<T> extends TreeDataProvider<T> {
    protected client: InputStreamClient | undefined;

    constructor(
        protected name: string,
        onDidChangeInputStreamClient: vscode.Event<InputStreamClient>,
    ) {
        super(name);
        onDidChangeInputStreamClient(this.handleInputStreamClientChange, this, this.disposables);
    }

    handleInputStreamClientChange(client: InputStreamClient) {
        this.client = client;
        this.clear();
    }

    clear() {
        this.refresh();
    }

}
