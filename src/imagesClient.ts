import * as grpc from '@grpc/grpc-js';

import { createDeadline, GrpcClient } from './grpc';
import { ImagesClient } from './proto/build/stack/inputstream/v1beta1/Images';
import { SearchImagesRequest } from './proto/build/stack/inputstream/v1beta1/SearchImagesRequest';
import { SearchImagesResponse } from './proto/build/stack/inputstream/v1beta1/SearchImagesResponse';
import { inputstream as isgwa } from "inputstream-grcpweb-api";
import { SearchImage } from './proto/build/stack/inputstream/v1beta1/SearchImage';

export interface IImagesClient {
    searchImages(request: SearchImagesRequest): Promise<SearchImagesResponse>;
}

export class ImagesGrpcNodeClient extends GrpcClient<ImagesClient> implements IImagesClient {
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

export class ImagesGrpcWebClient implements IImagesClient {
    constructor(
        private client: isgwa.Client,
    ) {
    }

    searchImages(request: SearchImagesRequest): Promise<SearchImagesResponse> {
        return new Promise<SearchImagesResponse>((resolve, reject) => {
            this.client.searchImages(request.query || '', request.page || 0).then((result) => {
                const images: SearchImage[] = result.map((item) => {
                    const image: SearchImage = {
                        unsplash: item,
                    };
                    return image;
                });
                const response: SearchImagesResponse = {
                    image: images,
                    totalImages: result.length || 0,
                };
                resolve(response);
            }, err => {
                reject(err);
            });
        });
    }
}

