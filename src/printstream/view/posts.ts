import Long = require('long');
import * as luxon from 'luxon';
import * as vscode from 'vscode';
import { User } from '../../proto/build/stack/auth/v1beta1/User';
import { Post } from '../../proto/build/stack/printstream/v1beta1/Post';
import { PsClient } from '../client';
import { CommandName, ContextValue, ThemeIconFile, ViewName } from '../constants';
import { PsClientTreeDataProvider } from './psclienttreedataprovider';

/**
 * Renders a view for bezel license status.  Makes a call to the status
 * endpoint to gather the data.
 */
export class PostsView extends PsClientTreeDataProvider<PostItem> {

    private items: PostItem[] = [];
    private user: User | undefined;

    constructor(
        onDidChangePsClientChange: vscode.Event<PsClient>,
        onDidAuthUserChange: vscode.Event<User>,
    ) {
        super(ViewName.Posts, onDidChangePsClientChange);
        
        onDidAuthUserChange(user => {
            this.user = user;
            this.clear();
        }, this, this.disposables);
    }

    registerCommands() {
        super.registerCommands();
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
        const posts = await this.client.listPosts(this.user.login!);
        return posts?.map(post => new PostItem(post));
    }
}

export class PostItem extends vscode.TreeItem {

    constructor(
        public readonly post: Post,
        public label?: string,
    ) {
        super(label || `"${post.title!}"`);

        const createdAt: luxon.DateTime = 
            luxon.DateTime.fromSeconds(
                    Long.fromValue(post.createdAt?.seconds!).toNumber());
        let when = createdAt.toISODate() || undefined;
    
        this.label = when;
        this.tooltip = `${createdAt}: "${post.title}" (${post.id})`;
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


