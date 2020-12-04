import Long = require('long');
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as rimraf from 'rimraf';
import * as vscode from 'vscode';
import { Post } from '../../proto/build/stack/printstream/v1beta1/Post';
import { FileSystems, ViewName } from '../constants';


/**
 * Renders a view for bezel license status.  Makes a call to the status
 * endpoint to gather the data.
 */
export class PsFileExplorer implements vscode.Disposable {
    protected disposables: vscode.Disposable[] = [];
    protected explorer: PostFileSystemProvider;

    constructor(
        onDidPostChange: vscode.Event<Post>,
    ) {
        this.explorer = new PostFileSystemProvider();
        this.disposables.push(
            vscode.workspace.registerFileSystemProvider(FileSystems.PsFs, this.explorer, { isCaseSensitive: true }));

        // this.disposables.push(vscode.commands.registerCommand('memfs.workspaceInit', _ => {
        //     vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.parse(`${FileSystems.PsFs}:/`), name: 'PsFs - Sample' });
        // }));
		this.disposables.push(vscode.window.createTreeView(ViewName.FileExplorer, { treeDataProvider: this.explorer }));
        this.disposables.push(vscode.commands.registerCommand('fileExplorer.openFile', (resource) => this.openResource(resource)));
        onDidPostChange(post => {
            this.explorer.setPost(post);
        }, this, this.disposables);
	}

	private openResource(resource: vscode.Uri): void {
		vscode.window.showTextDocument(resource);
	}

    dispose() {
        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables.length = 0;
    }
}

export class PostFileSystemProvider implements vscode.TreeDataProvider<Entry>, vscode.FileSystemProvider {

	private _onDidChangeFile: vscode.EventEmitter<vscode.FileChangeEvent[]> = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFile.event;
    private _onDidChangeTreeData: vscode.EventEmitter<Entry | undefined> = new vscode.EventEmitter<Entry | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Entry | undefined> = this._onDidChangeTreeData.event;

    private post: Post | undefined;
    
	constructor() {
	}

    setPost(post: Post) {
        this.post = post;
        this._onDidChangeTreeData.fire(undefined);
    }
    
	watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
		const watcher = fs.watch(uri.fsPath, { recursive: options.recursive }, async (event: string, filename: string | Buffer) => {
			const filepath = path.join(uri.fsPath, _.normalizeNFC(filename.toString()));

			// TODO support excludes (using minimatch library?)

			this._onDidChangeFile.fire([{
				type: event === 'change' ? vscode.FileChangeType.Changed : await _.exists(filepath) ? vscode.FileChangeType.Created : vscode.FileChangeType.Deleted,
				uri: uri.with({ path: filepath })
			} as vscode.FileChangeEvent]);
		});

		return { dispose: () => watcher.close() };
	}

	stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
		return this._stat(uri.fsPath);
	}

	async _stat(path: string): Promise<vscode.FileStat> {
		return new FileStat(await _.stat(path));
	}

	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
		return this._readDirectory(uri);
	}

	async _readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
		const children = await _.readdir(uri.fsPath);

		const result: [string, vscode.FileType][] = [];
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			const stat = await this._stat(path.join(uri.fsPath, child));
			result.push([child, stat.type]);
		}

		return Promise.resolve(result);
	}

	createDirectory(uri: vscode.Uri): void | Thenable<void> {
		return _.mkdir(uri.fsPath);
	}

	readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
		return _.readfile(uri.fsPath);
	}

	writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void | Thenable<void> {
		return this._writeFile(uri, content, options);
	}

	async _writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
		const exists = await _.exists(uri.fsPath);
		if (!exists) {
			if (!options.create) {
				throw vscode.FileSystemError.FileNotFound();
			}

			await _.mkdir(path.dirname(uri.fsPath));
		} else {
			if (!options.overwrite) {
				throw vscode.FileSystemError.FileExists();
			}
		}

		return _.writefile(uri.fsPath, content as Buffer);
	}

	delete(uri: vscode.Uri, options: { recursive: boolean; }): void | Thenable<void> {
		if (options.recursive) {
			return _.rmrf(uri.fsPath);
		}

		return _.unlink(uri.fsPath);
	}

	rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
		return this._rename(oldUri, newUri, options);
	}

	async _rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): Promise<void> {
		const exists = await _.exists(newUri.fsPath);
		if (exists) {
			if (!options.overwrite) {
				throw vscode.FileSystemError.FileExists();
			} else {
				await _.rmrf(newUri.fsPath);
			}
		}

		const parentExists = await _.exists(path.dirname(newUri.fsPath));
		if (!parentExists) {
			await _.mkdir(path.dirname(newUri.fsPath));
		}

		return _.rename(oldUri.fsPath, newUri.fsPath);
	}

	// tree data provider

	async getChildren(element?: Entry): Promise<Entry[]> {
		if (element) {
            const files: Entry[] = [];
            if (!element.post) {
                return files;
            }
            files.push({
                uri: vscode.Uri.parse(`psfs:${element.post.id}/main.md`),
                type: vscode.FileType.File,
                post: this.post,
            });

            return files;
		}

        if (!this.post) {
            return [];
        }
        
        const root: Entry = {
            uri: vscode.Uri.parse(`psfs:${this.post.id}/`),
            type: vscode.FileType.Directory,
            post: this.post,
        };
        
		return [root];
	}

	getTreeItem(element: Entry): vscode.TreeItem {
		const treeItem = new vscode.TreeItem(element.uri, element.type === vscode.FileType.Directory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
		if (element.type === vscode.FileType.File) {
			treeItem.command = { command: 'fileExplorer.openFile', title: 'Open File', arguments: [element.uri], };
			treeItem.contextValue = 'file';
		}
		return treeItem;
	}
}

export class PsFileSystemProvider implements vscode.TreeDataProvider<Entry>, vscode.FileSystemProvider {

	private _onDidChangeFile: vscode.EventEmitter<vscode.FileChangeEvent[]>;

	constructor() {
		this._onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	}

	get onDidChangeFile(): vscode.Event<vscode.FileChangeEvent[]> {
		return this._onDidChangeFile.event;
	}

	watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
		const watcher = fs.watch(uri.fsPath, { recursive: options.recursive }, async (event: string, filename: string | Buffer) => {
			const filepath = path.join(uri.fsPath, _.normalizeNFC(filename.toString()));

			// TODO support excludes (using minimatch library?)

			this._onDidChangeFile.fire([{
				type: event === 'change' ? vscode.FileChangeType.Changed : await _.exists(filepath) ? vscode.FileChangeType.Created : vscode.FileChangeType.Deleted,
				uri: uri.with({ path: filepath })
			} as vscode.FileChangeEvent]);
		});

		return { dispose: () => watcher.close() };
	}

	stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
		return this._stat(uri.fsPath);
	}

	async _stat(path: string): Promise<vscode.FileStat> {
		return new FileStat(await _.stat(path));
	}

	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
		return this._readDirectory(uri);
	}

	async _readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
		const children = await _.readdir(uri.fsPath);

		const result: [string, vscode.FileType][] = [];
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			const stat = await this._stat(path.join(uri.fsPath, child));
			result.push([child, stat.type]);
		}

		return Promise.resolve(result);
	}

	createDirectory(uri: vscode.Uri): void | Thenable<void> {
		return _.mkdir(uri.fsPath);
	}

	readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
		return _.readfile(uri.fsPath);
	}

	writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void | Thenable<void> {
		return this._writeFile(uri, content, options);
	}

	async _writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
		const exists = await _.exists(uri.fsPath);
		if (!exists) {
			if (!options.create) {
				throw vscode.FileSystemError.FileNotFound();
			}

			await _.mkdir(path.dirname(uri.fsPath));
		} else {
			if (!options.overwrite) {
				throw vscode.FileSystemError.FileExists();
			}
		}

		return _.writefile(uri.fsPath, content as Buffer);
	}

	delete(uri: vscode.Uri, options: { recursive: boolean; }): void | Thenable<void> {
		if (options.recursive) {
			return _.rmrf(uri.fsPath);
		}

		return _.unlink(uri.fsPath);
	}

	rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
		return this._rename(oldUri, newUri, options);
	}

	async _rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): Promise<void> {
		const exists = await _.exists(newUri.fsPath);
		if (exists) {
			if (!options.overwrite) {
				throw vscode.FileSystemError.FileExists();
			} else {
				await _.rmrf(newUri.fsPath);
			}
		}

		const parentExists = await _.exists(path.dirname(newUri.fsPath));
		if (!parentExists) {
			await _.mkdir(path.dirname(newUri.fsPath));
		}

		return _.rename(oldUri.fsPath, newUri.fsPath);
	}

	// tree data provider

	async getChildren(element?: Entry): Promise<Entry[]> {
		if (element) {
			const children = await this.readDirectory(element.uri);
			return children.map(([name, type]) => ({ uri: vscode.Uri.file(path.join(element.uri.fsPath, name)), type }));
		}

		const workspaceFolder = vscode.workspace.workspaceFolders!.filter(folder => folder.uri.scheme === 'file')[0];
		if (workspaceFolder) {
			const children = await this.readDirectory(workspaceFolder.uri);
			children.sort((a, b) => {
				if (a[1] === b[1]) {
					return a[0].localeCompare(b[0]);
				}
				return a[1] === vscode.FileType.Directory ? -1 : 1;
			});
			return children.map(([name, type]) => ({ uri: vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, name)), type }));
		}

		return [];
	}

	getTreeItem(element: Entry): vscode.TreeItem {
		const treeItem = new vscode.TreeItem(element.uri, element.type === vscode.FileType.Directory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
		if (element.type === vscode.FileType.File) {
			treeItem.command = { command: 'fileExplorer.openFile', title: 'Open File', arguments: [element.uri], };
			treeItem.contextValue = 'file';
		}
		return treeItem;
	}
}


namespace _ {

	function handleResult<T>(resolve: (result: T) => void, reject: (error: Error) => void, error: Error | null | undefined, result: T): void {
		if (error) {
			reject(massageError(error));
		} else {
			resolve(result);
		}
	}

	function massageError(error: Error & { code?: string }): Error {
		if (error.code === 'ENOENT') {
			return vscode.FileSystemError.FileNotFound();
		}

		if (error.code === 'EISDIR') {
			return vscode.FileSystemError.FileIsADirectory();
		}

		if (error.code === 'EEXIST') {
			return vscode.FileSystemError.FileExists();
		}

		if (error.code === 'EPERM' || error.code === 'EACCESS') {
			return vscode.FileSystemError.NoPermissions();
		}

		return error;
	}

	export function checkCancellation(token: vscode.CancellationToken): void {
		if (token.isCancellationRequested) {
			throw new Error('Operation cancelled');
		}
	}

	export function normalizeNFC(items: string): string;
	export function normalizeNFC(items: string[]): string[];
	export function normalizeNFC(items: string | string[]): string | string[] {
		if (process.platform !== 'darwin') {
			return items;
		}

		if (Array.isArray(items)) {
			return items.map(item => item.normalize('NFC'));
		}

		return items.normalize('NFC');
	}

	export function readdir(path: string): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			fs.readdir(path, (error, children) => handleResult(resolve, reject, error, normalizeNFC(children)));
		});
	}

	export function stat(path: string): Promise<fs.Stats> {
		return new Promise<fs.Stats>((resolve, reject) => {
			fs.stat(path, (error, stat) => handleResult(resolve, reject, error, stat));
		});
	}

	export function readfile(path: string): Promise<Buffer> {
		return new Promise<Buffer>((resolve, reject) => {
			fs.readFile(path, (error, buffer) => handleResult(resolve, reject, error, buffer));
		});
	}

	export function writefile(path: string, content: Buffer): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fs.writeFile(path, content, error => handleResult(resolve, reject, error, void 0));
		});
	}

	export function exists(path: string): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			fs.exists(path, exists => handleResult(resolve, reject, null, exists));
		});
	}

	export function rmrf(path: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			rimraf(path, error => handleResult(resolve, reject, error, void 0));
		});
	}

	export function mkdir(path: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			mkdirp(path, error => handleResult(resolve, reject, error, void 0));
		});
	}

	export function rename(oldPath: string, newPath: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fs.rename(oldPath, newPath, error => handleResult(resolve, reject, error, void 0));
		});
	}

	export function unlink(path: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fs.unlink(path, error => handleResult(resolve, reject, error, void 0));
		});
	}
}

export class FileStat implements vscode.FileStat {

	constructor(private fsStat: fs.Stats) { }

	get type(): vscode.FileType {
		return this.fsStat.isFile() ? vscode.FileType.File : this.fsStat.isDirectory() ? vscode.FileType.Directory : this.fsStat.isSymbolicLink() ? vscode.FileType.SymbolicLink : vscode.FileType.Unknown;
	}

	get isFile(): boolean | undefined {
		return this.fsStat.isFile();
	}

	get isDirectory(): boolean | undefined {
		return this.fsStat.isDirectory();
	}

	get isSymbolicLink(): boolean | undefined {
		return this.fsStat.isSymbolicLink();
	}

	get size(): number {
		return this.fsStat.size;
	}

	get ctime(): number {
		return this.fsStat.ctime.getTime();
	}

	get mtime(): number {
		return this.fsStat.mtime.getTime();
	}
}

interface Entry {
	uri: vscode.Uri;
    type: vscode.FileType;
    post?: Post;
}


// class DateiFileSystemProvider implements vscode.FileSystemProvider {

//     private _onDidChangeFile: vscode.EventEmitter<vscode.FileChangeEvent[]>;

//     constructor() {
//         this._onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
//     }

//     get onDidChangeFile(): vscode.Event<vscode.FileChangeEvent[]> {
//         return this._onDidChangeFile.event;
//     }

//     watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
//         const watcher = fs.watch(uri.fsPath, { recursive: options.recursive }, async (event: string, filename: string | Buffer) => {
//             const filepath = path.join(uri.fsPath, _.normalizeNFC(filename.toString()));

//             // TODO support excludes (using minimatch library?)

//             this._onDidChangeFile.fire([{
//                 type: event === 'change' ? vscode.FileChangeType.Changed : await _.exists(filepath) ? vscode.FileChangeType.Created : vscode.FileChangeType.Deleted,
//                 uri: uri.with({ path: filepath })
//             } as vscode.FileChangeEvent]);
//         });

//         return { dispose: () => watcher.close() };
//     }

//     async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
//         return this._stat(uri.fsPath);
//     }

//     async _stat(path: string): Promise<vscode.FileStat> {
//         const res = await _.statLink(path);
//         return new FileStat(res.stat, res.isSymbolicLink);
//     }

//     async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
//         return this._readDirectory(uri);
//     }

//     async _readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
//         const children = await _.readdir(uri.fsPath);

//         const result: [string, vscode.FileType][] = [];
//         for (let i = 0; i < children.length; i++) {
//             const child = children[i];
//             const stat = await this._stat(path.join(uri.fsPath, child));
//             result.push([child, stat.type]);
//         }

//         return Promise.resolve(result);
//     }

//     async createDirectory(uri: vscode.Uri): Promise<void> {
//         return _.mkdir(uri.fsPath);
//     }

//     async readFile(uri: vscode.Uri): Promise<Uint8Array> {
//         return _.readfile(uri.fsPath);
//     }

//     async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
//         return this._writeFile(uri, content, options);
//     }

//     async _writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
//         const exists = await _.exists(uri.fsPath);
//         if (!exists) {
//             if (!options.create) {
//                 throw vscode.FileSystemError.FileNotFound();
//             }

//             await _.mkdir(path.dirname(uri.fsPath));
//         } else {
//             if (!options.overwrite) {
//                 throw vscode.FileSystemError.FileExists();
//             }
//         }

//         return _.writefile(uri.fsPath, content as Buffer);
//     }

//     delete(uri: vscode.Uri, options: { recursive: boolean; }): void | Thenable<void> {
//         if (options.recursive) {
//             return _.rmrf(uri.fsPath);
//         }

//         return _.unlink(uri.fsPath);
//     }

//     rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
//         return this._rename(oldUri, newUri, options);
//     }

//     async _rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): Promise<void> {
//         const exists = await _.exists(newUri.fsPath);
//         if (exists) {
//             if (!options.overwrite) {
//                 throw vscode.FileSystemError.FileExists();
//             } else {
//                 await _.rmrf(newUri.fsPath);
//             }
//         }

//         const parentExists = await _.exists(path.dirname(newUri.fsPath));
//         if (!parentExists) {
//             await _.mkdir(path.dirname(newUri.fsPath));
//         }

//         return _.rename(oldUri.fsPath, newUri.fsPath);
//     }

//     // /**
//     //  * Copy files or folders. Implementing this function is optional but it will
//     //  * speedup the copy operation.
//     //  *
//     //  * @param source The existing file.
//     //  * @param destination The destination location.
//     //  * @param options Defines if existing files should be overwritten.
//     //  * @throws [`FileNotFound`](#FileSystemError.FileNotFound) when `source`
//     //  * doesn't exist.
//     //  * @throws [`FileNotFound`](#FileSystemError.FileNotFound) when parent of
//     //  * `destination` doesn't exist, e.g. no mkdirp-logic required.
//     //  * @throws [`FileExists`](#FileSystemError.FileExists) when `destination`
//     //  * exists and when the `overwrite` option is not `true`.
//     //  * @throws [`NoPermissions`](#FileSystemError.NoPermissions) when
//     //  * permissions aren't sufficient.
//     //  */
//     // copy?(source: vscode.Uri, destination: vscode.Uri, options: { overwrite: boolean }): void | Thenable<void> {
//     // // TODO can implement a fast copy() method with node.js 8.x new fs.copy method
//     // throw new Error('Unimplemented');
//     // }
// }

// //#region Utilities

// export interface IStatAndLink {
//     stat: fs.Stats;
//     isSymbolicLink: boolean;
// }

// namespace _ {

//     function handleResult<T>(resolve: (result: T) => void, reject: (error: Error) => void, error: Error | null | undefined, result: T): void {
//         if (error) {
//             reject(massageError(error));
//         } else {
//             resolve(result);
//         }
//     }

//     function massageError(error: Error & { code?: string }): Error {
//         if (error.code === 'ENOENT') {
//             return vscode.FileSystemError.FileNotFound();
//         }

//         if (error.code === 'EISDIR') {
//             return vscode.FileSystemError.FileIsADirectory();
//         }

//         if (error.code === 'EEXIST') {
//             return vscode.FileSystemError.FileExists();
//         }

//         if (error.code === 'EPERM' || error.code === 'EACCESS') {
//             return vscode.FileSystemError.NoPermissions();
//         }

//         return error;
//     }

//     export function checkCancellation(token: vscode.CancellationToken): void {
//         if (token.isCancellationRequested) {
//             throw new Error('Operation cancelled');
//         }
//     }

//     export function normalizeNFC(items: string): string;
//     export function normalizeNFC(items: string[]): string[];
//     export function normalizeNFC(items: string | string[]): string | string[] {
//         if (process.platform !== 'darwin') {
//             return items;
//         }

//         if (Array.isArray(items)) {
//             return items.map(item => item.normalize('NFC'));
//         }

//         return items.normalize('NFC');
//     }

//     export function readdir(path: string): Promise<string[]> {
//         return new Promise<string[]>((resolve, reject) => {
//             fs.readdir(path, (error, children) => handleResult(resolve, reject, error, normalizeNFC(children)));
//         });
//     }

//     export function readfile(path: string): Promise<Buffer> {
//         return new Promise<Buffer>((resolve, reject) => {
//             fs.readFile(path, (error, buffer) => handleResult(resolve, reject, error, buffer));
//         });
//     }

//     export function writefile(path: string, content: Buffer): Promise<void> {
//         return new Promise<void>((resolve, reject) => {
//             fs.writeFile(path, content, error => handleResult(resolve, reject, error, void 0));
//         });
//     }

//     export function exists(path: string): Promise<boolean> {
//         return new Promise<boolean>((resolve, reject) => {
//             fs.exists(path, exists => handleResult(resolve, reject, null, exists));
//         });
//     }

//     export function rmrf(path: string): Promise<void> {
//         return new Promise<void>((resolve, reject) => {
//             rimraf(path, error => handleResult(resolve, reject, error, void 0));
//         });
//     }

//     export function mkdir(path: string): Promise<void> {
//         return new Promise<void>((resolve, reject) => {
//             mkdirp(path, error => handleResult(resolve, reject, error, void 0));
//         });
//     }

//     export function rename(oldPath: string, newPath: string): Promise<void> {
//         return new Promise<void>((resolve, reject) => {
//             fs.rename(oldPath, newPath, error => handleResult(resolve, reject, error, void 0));
//         });
//     }

//     export function unlink(path: string): Promise<void> {
//         return new Promise<void>((resolve, reject) => {
//             fs.unlink(path, error => handleResult(resolve, reject, error, void 0));
//         });
//     }

//     export function statLink(path: string): Promise<IStatAndLink> {
//         return new Promise((resolve, reject) => {
//             fs.lstat(path, (error, lstat) => {
//                 if (error || lstat.isSymbolicLink()) {
//                     fs.stat(path, (error, stat) => {
//                         if (error) {
//                             return handleResult(resolve, reject, error, void 0);
//                         }

//                         handleResult(resolve, reject, error, { stat, isSymbolicLink: lstat && lstat.isSymbolicLink() });
//                     });
//                 } else {
//                     handleResult(resolve, reject, error, { stat: lstat, isSymbolicLink: false });
//                 }
//             });

//         });
//     }
// }

// export class FileStat implements vscode.FileStat {

//     constructor(private fsStat: fs.Stats, private _isSymbolicLink: boolean) { }

//     get type(): vscode.FileType {
//         let type: number;
//         if (this._isSymbolicLink) {
//             type = vscode.FileType.SymbolicLink | (this.fsStat.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File);
//         } else {
//             type = this.fsStat.isFile() ? vscode.FileType.File : this.fsStat.isDirectory() ? vscode.FileType.Directory : vscode.FileType.Unknown;
//         }

//         return type;
//     }

//     get isFile(): boolean | undefined {
//         return this.fsStat.isFile();
//     }

//     get isDirectory(): boolean | undefined {
//         return this.fsStat.isDirectory();
//     }

//     get isSymbolicLink(): boolean | undefined {
//         return this._isSymbolicLink;
//     }

//     get size(): number {
//         return this.fsStat.size;
//     }

//     get ctime(): number {
//         return this.fsStat.ctime.getTime();
//     }

//     get mtime(): number {
//         return this.fsStat.mtime.getTime();
//     }
// }
