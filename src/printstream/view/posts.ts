import Long = require('long');
import * as luxon from 'luxon';
import * as vscode from 'vscode';
import { formatTimestampISODate } from '../../common';
import { User } from '../../proto/build/stack/auth/v1beta1/User';
import { Post } from '../../proto/build/stack/printstream/v1beta1/Post';
import { PsClient } from '../client';
import { ButtonName, CommandName, ContextValue, ThemeIconFile, ViewName } from '../constants';
import { PsClientTreeDataProvider } from './psclienttreedataprovider';

/**
 * Renders a view for bezel license status.  Makes a call to the status
 * endpoint to gather the data.
 */
export class PostsView extends PsClientTreeDataProvider<PostItem> {
    private items: PostItem[] | undefined;
    private user: User | undefined;
    // currently selected post
    private currentPost: Post | undefined;

    constructor(
        onDidChangePsClientChange: vscode.Event<PsClient>,
        onDidAuthUserChange: vscode.Event<User>,
        onDidPostChange: vscode.EventEmitter<Post>,
    ) {
        super(ViewName.DraftExplorer, onDidChangePsClientChange);

        onDidAuthUserChange(user => {
            this.user = user;
            this.clear();
        }, this, this.disposables);

        this.disposables.push(this.onDidChangeTreeData(() => {
            if (this.currentPost) {
                const item = this.getPostItemById(this.currentPost.id!);
                if (item) {
                    this.view.reveal(item);
                }
            }
        }));
        this.disposables.push(vscode.commands.registerCommand(CommandName.PostOpen, (item: PostItem) => {
            this.view.reveal(item);
            onDidPostChange.fire(item.post);
        }));
    }

    registerCommands() {
        super.registerCommands();

        this.disposables.push(vscode.commands.registerCommand(CommandName.PostCreate, this.handleCommandPostCreate, this));
        this.disposables.push(vscode.commands.registerCommand(CommandName.PostRemove, this.handleCommandPostRemove, this));
    }

    getTreeItem(element: PostItem): vscode.TreeItem {
        return element;
    }

    async getRootItems(): Promise<PostItem[] | undefined> {
        if (!this.client) {
            return undefined;
        }
        if (!this.user) {
            return undefined;
        }
        try {
            const posts = await this.client.listPosts(this.user.login!);
            if (!posts) {
                return undefined;
            }
            sortPostsByCreateTime(posts);
            return this.items = posts.map(post => new PostItem(post));
        } catch (err) {
            console.log(`Could not list posts: ${err.message}`);
            return undefined;
        }
    }

    async handleCommandPostCreate() {
        if (!this.client) {
            vscode.window.showWarningMessage('could not create post (client not connected)');
            return;
        }
        if (!this.user) {
            vscode.window.showWarningMessage('could not create post (user not logged in)');
            return;
        }
        try {
            const post = await this.client.createPost(this.user.login!);
            this.refresh();
            vscode.commands.executeCommand(CommandName.PostOpen, post);
        } catch (err) {
            vscode.window.showErrorMessage(`Could not create post: ${err.message}`);
            return undefined;
        }
    }

    async handleCommandPostRemove(item: PostItem) {
        const title = item.post.title;
        const when = formatTimestampISODate(item.post.createdAt);
        const action = await vscode.window.showInformationMessage(
            `Are you sure you want to remove draft "${title}" (${when})`, 
            ButtonName.Confirm, ButtonName.Cancel);
        if (action !== ButtonName.Confirm) {
            return;
        }
        try {
            const post = await this.client?.removePost(item.post.login!, item.post.id!);
            this.refresh();
            vscode.window.showInformationMessage(`Removed draft "${title}" (${when})`);
        } catch (err) {
            vscode.window.showErrorMessage(`Could not create post: ${err.message}`);
            return undefined;
        }
    }

    getPostItemById(id: string): PostItem | undefined {
        return this.items?.find(item => item.id === id);
    }
}

export class PostItem extends vscode.TreeItem {

    constructor(
        public readonly post: Post,
        public label?: string,
    ) {
        super(label || `"${post.title!}"`);

        let when = formatTimestampISODate(post.createdAt);

        this.label = when;
        this.tooltip = `${when}: "${post.title}" (${post.id})`;
        this.contextValue = ContextValue.Post;
        this.iconPath = ThemeIconFile;
        this.description = post.title;
        this.command = {
            title: 'Open File',
            command: CommandName.PostOpen,
            arguments: [this],
        };
    }

    async getChildren(): Promise<PostItem[] | undefined> {
        return undefined;
    }
}

/**
 * Sort the posts by creation time with most recent posts in front.
 * Array modified in place.
 * @param posts 
 */
function sortPostsByCreateTime(posts: Post[]) {
    posts?.sort((a, b) => {
        const tb = Long.fromValue(b.createdAt!.seconds!).toNumber();
        const ta = Long.fromValue(a.createdAt!.seconds!).toNumber();
        return tb - ta;
    });
}