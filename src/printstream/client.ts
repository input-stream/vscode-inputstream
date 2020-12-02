import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import { ListPostsResponse } from '../proto/build/stack/printstream/v1beta1/ListPostsResponse';
import { Post } from '../proto/build/stack/printstream/v1beta1/Post';
import { PostsClient } from '../proto/build/stack/printstream/v1beta1/Posts';
import { ProtoGrpcType as PrintstreamProtoGrpcType } from '../proto/printstream';
import { GRPCClient } from './grpcclient';

export class PsClient extends GRPCClient {
    private readonly posts: PostsClient;

    constructor(
        readonly proto: PrintstreamProtoGrpcType,
        readonly address: string,
        readonly token: string,
    ) {
        super(address);

        const v1beta1 = proto.build.stack.printstream.v1beta1;
        const creds = this.getCredentials(address);
        this.posts = this.add(new v1beta1.Posts(address, creds));
    }

    httpURL(): string {
        const address = this.address;
        const scheme = address.endsWith(':443') ? 'https' : 'http';
        return `${scheme}://${address}`;
    }

    protected handleErrorUnavailable(err: grpc.ServiceError): grpc.ServiceError {
        vscode.window.showWarningMessage(
            `The API at ${this.address} is unavailable.  Please check that the tcp connection is still valid.`,
        );
        return err;
    }

    async listPosts(login: string): Promise<Post[] | undefined> {
        return new Promise<Post[]>((resolve, reject) => {
            this.posts.ListPosts(
                { login },
                this.getGrpcMetadata(),
                { deadline: this.getDeadline() },
                async (err?: grpc.ServiceError, resp?: ListPostsResponse) => {
                    if (err) {
                        reject(this.handleError(err));
                    } else {
                        resolve(resp?.post);
                    }
                });
        });
    }

    getGrpcMetadata(): grpc.Metadata {
        const md = new grpc.Metadata();
        md.add('Authorization', `Bearer ${this.token}`);
        return md;
    }

}