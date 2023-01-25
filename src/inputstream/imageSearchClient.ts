import * as grpc from '@grpc/grpc-js';

import { AccessTokenRefresher } from './deviceLogin';
import { GRPCClient } from './grpcclient';
import { ImagesClient } from '../proto/build/stack/inputstream/v1beta1/Images';
import { SearchImagesRequest } from '../proto/build/stack/inputstream/v1beta1/SearchImagesRequest';
import { SearchImagesResponse } from '../proto/build/stack/inputstream/v1beta1/SearchImagesResponse';

export interface IImagesClient {
    searchImages(request: SearchImagesRequest): Promise<SearchImagesResponse>;
}

export class ImageSearchClient extends GRPCClient<ImagesClient> implements IImagesClient {

    constructor(
        client: ImagesClient,
        refresher: AccessTokenRefresher,
    ) {
        super(client, refresher);
    }

    async searchImages(request: SearchImagesRequest): Promise<SearchImagesResponse> {
        return new Promise<SearchImagesResponse>((resolve, reject) => {
            this.client.searchImages(
                request,
                this.getGrpcMetadata(),
                { deadline: this.getDeadline() },
                async (err: grpc.ServiceError | null, resp?: SearchImagesResponse) => {
                    if (err) {
                        reject(this.handleError(err));
                    } else {
                        resolve(resp!);
                    }
                });
        });
    }

}
