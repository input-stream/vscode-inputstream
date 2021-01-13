import * as vscode from 'vscode';

/**
 * Placeholder for future API.
 */
export class API implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
        
    constructor() {
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables.length = 0;
    }
}
