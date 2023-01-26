import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';

import { ReauthenticatingGrpcClient } from './authenticatingGrpcClient';
import { AccessTokenRefresher } from './loginController';
import { ImagesClient } from './proto/build/stack/inputstream/v1beta1/Images';
import { SearchImagesRequest } from './proto/build/stack/inputstream/v1beta1/SearchImagesRequest';
import { SearchImagesResponse } from './proto/build/stack/inputstream/v1beta1/SearchImagesResponse';

export interface IImagesClient {
    searchImages(request: SearchImagesRequest): Promise<SearchImagesResponse>;
}

export class ImagesGrpcClient extends ReauthenticatingGrpcClient<ImagesClient> implements IImagesClient, vscode.Disposable {

    constructor(
        client: ImagesClient,
        refresher: AccessTokenRefresher,
    ) {
        super(client, refresher);
    }

    searchImages(request: SearchImagesRequest): Promise<SearchImagesResponse> {
        return new Promise<SearchImagesResponse>((resolve, reject) => {
            const md = this.getGrpcMetadata();
            const deadline = this.getDeadline();

            this.client.searchImages(
                request,
                md,
                { deadline },
                (err: grpc.ServiceError | null, resp?: SearchImagesResponse) => {
                    if (err) {
                        reject(this.handleError(err));
                    } else {
                        resolve(resp!);
                    }
                });
        });
    }

    public dispose(): void {
        this.client.close();
    }

}
