import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import { AuthenticatingGrpcClient, ClientContext, createDeadline } from './grpc';

import { ImagesClient } from './proto/build/stack/inputstream/v1beta1/Images';
import { SearchImagesRequest } from './proto/build/stack/inputstream/v1beta1/SearchImagesRequest';
import { SearchImagesResponse } from './proto/build/stack/inputstream/v1beta1/SearchImagesResponse';


export interface IImagesClient {
    searchImages(request: SearchImagesRequest): Promise<SearchImagesResponse>;
}

export class ImagesGrpcClient extends AuthenticatingGrpcClient<ImagesClient> implements IImagesClient {
    constructor(
        client: ImagesClient,
        ctx: ClientContext,
    ) {
        super(client, ctx)
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
}
