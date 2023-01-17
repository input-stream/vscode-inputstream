import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import { ListInputsResponse } from '../proto/build/stack/inputstream/v1beta1/ListInputsResponse';
import { Input } from '../proto/build/stack/inputstream/v1beta1/Input';
import { InputsClient } from '../proto/build/stack/inputstream/v1beta1/Inputs';
import { RemoveInputResponse } from '../proto/build/stack/inputstream/v1beta1/RemoveInputResponse';
import { ProtoGrpcType as inputstreamProtoGrpcType } from '../proto/inputstream';
import { GRPCClient } from './grpcclient';
import { FieldMask } from '../proto/google/protobuf/FieldMask';
import { ButtonName } from './constants';
import { ImagesClient } from '../proto/build/stack/inputstream/v1beta1/Images';
import { SearchImagesResponse } from '../proto/build/stack/inputstream/v1beta1/SearchImagesResponse';
import { SearchImagesRequest } from '../proto/build/stack/inputstream/v1beta1/SearchImagesRequest';
import { UpdateInputResponse } from '../proto/build/stack/inputstream/v1beta1/UpdateInputResponse';
import { InputFilterOptions } from '../proto/build/stack/inputstream/v1beta1/InputFilterOptions';

grpc.setLogVerbosity(grpc.logVerbosity.DEBUG);

export class InputStreamClient extends GRPCClient {
    private readonly inputService: InputsClient;
    private readonly imagesService: ImagesClient;

    constructor(
        readonly proto: inputstreamProtoGrpcType,
        readonly address: string,
        private token: string,
        readonly refreshAccessToken: () => Promise<void>,
    ) {
        super(address);

        const v1beta1 = proto.build.stack.inputstream.v1beta1;
        const creds = this.getCredentials(address);
        this.inputService = this.add(new v1beta1.Inputs(address, creds));
        this.imagesService = this.add(new v1beta1.Images(address, creds));
    }

    httpURL(): string {
        const address = this.address;
        const scheme = address.endsWith(':443') ? 'https' : 'http';
        return `${scheme}://${address}`;
    }

    /**
     * Execute a grpc unary call having response type S.  If the call fails,
     * user will be prompted to retry up to the limit (defaults to 2).
     *
     * @param fn The function to invoke during an attempt.  Should return the
     * response type or fail to a grpc.ServiceError.
     * @param limit Max number of retries.
     */
    async unaryCall<S>(desc: string, fn: () => Promise<S>, limit = 2): Promise<S> {
        try {
            return await fn();
        } catch (e) {
            const err = e as grpc.ServiceError;

            // Reached terminal attempt, report error and bail
            if (limit === 0) {
                vscode.window.showErrorMessage(`${desc}: ${err.message} (operation will not be retried)`);
                throw err;
            }

            // Attempt to refresh the token if we are unauthenticated
            if (err.code === grpc.status.UNAUTHENTICATED) {
                try {
                    await this.refreshAccessToken();
                    return this.unaryCall(desc, fn, Math.max(0, limit - 1));
                } catch (e2) {
                    vscode.window.showWarningMessage('Could not refresh access token: ' + JSON.stringify(e2));
                }
            }

            // Prompt user to retry
            const action = await vscode.window.showInformationMessage(
                `${desc} failed: ${err.message} (${limit} attempts remaining)`,
                ButtonName.Retry, ButtonName.Cancel);
            if (action !== ButtonName.Retry) {
                throw err;
            }

            return this.unaryCall(desc, fn, Math.max(0, limit - 1));
        }
    }

    async listInputs(filter: InputFilterOptions): Promise<Input[] | undefined> {
        return this.unaryCall<Input[] | undefined>('List Inputs', (): Promise<Input[] | undefined> => {
            return new Promise<Input[]>((resolve, reject) => {
                this.inputService.listInputs(
                    {
                        filter: filter,
                        wantPrivate: true,
                    },
                    this.getGrpcMetadata(),
                    { deadline: this.getDeadline() },
                    async (err: grpc.ServiceError | null, resp?: ListInputsResponse) => {
                        if (err) {
                            reject(this.handleError(err));
                        } else {
                            if (resp?.input) {
                                resolve(resp.input);
                            } else {
                                reject(`panic: response object missing`);
                            }
                        }
                    });
            });
        });
    }

    async createInput(input: Input): Promise<Input | undefined> {
        return this.unaryCall<Input>('Create Input', (): Promise<Input> => {
            return new Promise<Input>((resolve, reject) => {
                this.inputService.createInput(
                    { input },
                    this.getGrpcMetadata(),
                    { deadline: this.getDeadline() },
                    async (err: grpc.ServiceError | null, resp?: Input) => {
                        if (err) {
                            reject(this.handleError(err));
                        } else {
                            resolve(resp!);
                        }
                    });
            });
        });
    }

    async getInput(filter: InputFilterOptions, mask?: FieldMask): Promise<Input | undefined> {
        return this.unaryCall<Input>('Get Input', (): Promise<Input> => {
            return new Promise<Input>((resolve, reject) => {
                this.inputService.getInput(
                    { filter, mask },
                    this.getGrpcMetadata(),
                    { deadline: this.getDeadline() },
                    async (err: grpc.ServiceError | null, resp?: Input) => {
                        if (err) {
                            reject(this.handleError(err));
                        } else {
                            resolve(resp!);
                        }
                    });
            });
        });
    }

    async updateInput(input: Input, mask: FieldMask): Promise<UpdateInputResponse> {
        return this.unaryCall<UpdateInputResponse>('Update Input', (): Promise<UpdateInputResponse> => {
            return new Promise<UpdateInputResponse>((resolve, reject) => {
                this.inputService.updateInput(
                    { input, mask },
                    this.getGrpcMetadata(),
                    { deadline: this.getDeadline() },
                    async (err: grpc.ServiceError | null, resp?: UpdateInputResponse) => {
                        if (err) {
                            reject(this.handleError(err));
                        } else {
                            resolve(resp!);
                        }
                    });
            });
        });
    }

    async removeInput(id: string): Promise<RemoveInputResponse> {
        return this.unaryCall<RemoveInputResponse>('Remove Input', (): Promise<RemoveInputResponse> => {
            return new Promise<RemoveInputResponse>((resolve, reject) => {
                this.inputService.removeInput(
                    { id },
                    this.getGrpcMetadata(),
                    { deadline: this.getDeadline() },
                    async (err: grpc.ServiceError | null, resp?: RemoveInputResponse) => {
                        if (err) {
                            reject(this.handleError(err));
                        } else {
                            resolve(resp!);
                        }
                    });
            });
        });
    }

    async searchImages(request: SearchImagesRequest): Promise<SearchImagesResponse> {
        return new Promise<SearchImagesResponse>((resolve, reject) => {
            this.imagesService.searchImages(
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

    getGrpcMetadata(): grpc.Metadata {
        const md = new grpc.Metadata({
            waitForReady: true,
        });
        md.add('Authorization', `Bearer ${this.token}`);
        return md;
    }

}
