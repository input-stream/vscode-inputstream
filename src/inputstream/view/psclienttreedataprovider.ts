import * as vscode from 'vscode';
import { PsClient } from '../client';
import { TreeDataProvider } from './treedataprovider';

/**
 * Base class for a view that interacts with a gRPC endpoint and produces tree
 * output.  All such views have a refresh command.
 */
export abstract class PsClientTreeDataProvider<T> extends TreeDataProvider<T> {
    protected client: PsClient | undefined;

    constructor(
        protected name: string,
        onDidChangePsClient: vscode.Event<PsClient>,
    ) {
        super(name);
        onDidChangePsClient(this.handlePsClientChange, this, this.disposables);
    }

    handlePsClientChange(client: PsClient) {
        this.client = client;
        this.clear();
    }

    clear() {
        this.refresh();
    }

}
