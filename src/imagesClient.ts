import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import { ClientContext, createDeadline } from './grpc';

import { ImagesClient } from './proto/build/stack/inputstream/v1beta1/Images';
import { SearchImagesRequest } from './proto/build/stack/inputstream/v1beta1/SearchImagesRequest';
import { SearchImagesResponse } from './proto/build/stack/inputstream/v1beta1/SearchImagesResponse';


export interface IImagesClient {
    searchImages(request: SearchImagesRequest): Promise<SearchImagesResponse>;
}

export class ImagesGrpcClient implements IImagesClient, vscode.Disposable {

    constructor(
        private client: ImagesClient,
        private ctx: ClientContext,
    ) {
    }

    searchImages(request: SearchImagesRequest): Promise<SearchImagesResponse> {
        return new Promise<SearchImagesResponse>((resolve, reject) => {
            this.client.searchImages(
                request,
                this.createCallMetadata(),
                { deadline: createDeadline() },
                (err: grpc.ServiceError | null, resp?: SearchImagesResponse) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(resp!);
                    }
                });
        });
    }

    public dispose(): void {
        this.client.close();
    }

    private createCallMetadata(): grpc.Metadata {
        const md = new grpc.Metadata();
        const token = this.ctx.accessToken();
        if (token) {
            md.add('Authorization', `Bearer ${this.ctx.accessToken()}`);
        }
        return md;
    }
}
