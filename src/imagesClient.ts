import * as grpc from '@grpc/grpc-js';

import { createDeadline, GrpcClient } from './grpc';
import { ImagesClient } from './proto/build/stack/inputstream/v1beta1/Images';
import { SearchImagesRequest } from './proto/build/stack/inputstream/v1beta1/SearchImagesRequest';
import { SearchImagesResponse } from './proto/build/stack/inputstream/v1beta1/SearchImagesResponse';


export interface IImagesClient {
    searchImages(request: SearchImagesRequest): Promise<SearchImagesResponse>;
}

export class ImagesGrpcClient extends GrpcClient<ImagesClient> implements IImagesClient {
    constructor(
        client: ImagesClient,
    ) {
        super(client);
    }

    searchImages(request: SearchImagesRequest): Promise<SearchImagesResponse> {
        return new Promise<SearchImagesResponse>((resolve, reject) => {
            this.client.searchImages(
                request,
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
