import * as vscode from 'vscode';

export class Filesystem implements vscode.FileSystem {
    constructor(private provider: vscode.FileSystemProvider) { }

    /**
     * Retrieve metadata about a file.
     *
     * @param uri The uri of the file to retrieve metadata about.
     * @return The file metadata about the file.
     */
    public async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        return this.provider.stat(uri);
    }

    /**
     * Retrieve all entries of a [directory](#FileType.Directory).
     *
     * @param uri The uri of the folder.
     * @return An array of name/type-tuples or a thenable that resolves to such.
     */
    public async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        return this.provider.readDirectory(uri);
    }

    /**
     * Create a new directory (Note, that new files are created via `write`-calls).
     *
     * *Note* that missing directories are created automatically, e.g this call has
     * `mkdirp` semantics.
     *
     * @param uri The uri of the new folder.
     */
    public async createDirectory(uri: vscode.Uri): Promise<void> {
        return this.provider.createDirectory(uri);
    }

    /**
     * Read the entire contents of a file.
     *
     * @param uri The uri of the file.
     * @return An array of bytes or a thenable that resolves to such.
     */
    public async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        return this.provider.readFile(uri);
    }

    /**
     * Write data to a file, replacing its entire contents.
     *
     * @param uri The uri of the file.
     * @param content The new content of the file.
     */
    public async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
        return this.provider.writeFile(uri, content, {
            create: true,
            overwrite: true,
        });
    }

    /**
     * Delete a file.
     *
     * @param uri The resource that is to be deleted.
     * @param options Defines if trash can should be used and if deletion of folders is recursive
     */
    public async delete(uri: vscode.Uri, options?: { recursive?: boolean, useTrash?: boolean }): Promise<void> {
        return this.provider.delete(uri, { recursive: options?.recursive || false });
    }

    /**
     * Rename a file or folder.
     *
     * @param oldUri The existing file.
     * @param newUri The new location.
     * @param options Defines if existing files should be overwritten.
     */
    public async rename(source: vscode.Uri, target: vscode.Uri, options?: { overwrite?: boolean }): Promise<void> {
        return this.provider.rename(source, target, {
            overwrite: options?.overwrite || false,
        });
    }

    /**
     * Copy files or folders.
     *
     * @param source The existing file.
     * @param destination The destination location.
     * @param options Defines if existing files should be overwritten.
     */
    public async copy(source: vscode.Uri, target: vscode.Uri, options?: { overwrite?: boolean }): Promise<void> {
        if (!this.provider.copy) {
            throw vscode.FileSystemError.NoPermissions('unsupported operation: copy');
        }
        return this.provider.copy(source, target, {
            overwrite: options?.overwrite || false,
        });
    }

    public isWritableFileSystem(scheme: string): boolean | undefined {
        return true;
    }
}

