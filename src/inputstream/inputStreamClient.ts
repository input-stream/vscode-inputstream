import * as grpc from '@grpc/grpc-js';

import { AccessTokenRefresher } from './device_login';
import { FieldMask } from '../proto/google/protobuf/FieldMask';
import { GRPCClient, UnaryCallOptions } from './grpcclient';
import { Input } from '../proto/build/stack/inputstream/v1beta1/Input';
import { InputFilterOptions } from '../proto/build/stack/inputstream/v1beta1/InputFilterOptions';
import { InputsClient } from '../proto/build/stack/inputstream/v1beta1/Inputs';
import { ListInputsResponse } from '../proto/build/stack/inputstream/v1beta1/ListInputsResponse';
import { RemoveInputResponse } from '../proto/build/stack/inputstream/v1beta1/RemoveInputResponse';
import { UpdateInputResponse } from '../proto/build/stack/inputstream/v1beta1/UpdateInputResponse';

export interface IInputsClient {
    createInput(input: Input, options?: UnaryCallOptions): Promise<Input | undefined>;
    getInput(filter: InputFilterOptions, mask?: FieldMask, options?: UnaryCallOptions): Promise<Input | undefined>;
    listInputs(filter: InputFilterOptions, options?: UnaryCallOptions): Promise<Input[] | undefined>;
    updateInput(input: Input, mask: FieldMask, options?: UnaryCallOptions): Promise<UpdateInputResponse>;
    removeInput(id: string, options?: UnaryCallOptions): Promise<RemoveInputResponse>;
}

export class InputsGRPCClient extends GRPCClient<InputsClient> implements IInputsClient {

    constructor(
        client: InputsClient,
        refresher: AccessTokenRefresher,
    ) {
        super(client, refresher);
    }

    async listInputs(filter: InputFilterOptions, options?: UnaryCallOptions): Promise<Input[] | undefined> {
        return this.unaryCall<Input[] | undefined>('List Inputs', (): Promise<Input[] | undefined> => {
            return new Promise<Input[]>((resolve, reject) => {
                this.client.listInputs(
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
        }, options?.limit, options?.silent);
    }

    async createInput(input: Input, options?: UnaryCallOptions): Promise<Input | undefined> {
        return this.unaryCall<Input>('Create Input', (): Promise<Input> => {
            return new Promise<Input>((resolve, reject) => {
                this.client.createInput(
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
        }, options?.limit, options?.silent);
    }

    async getInput(filter: InputFilterOptions, mask?: FieldMask, options?: UnaryCallOptions): Promise<Input | undefined> {
        return this.unaryCall<Input>('Get Input', (): Promise<Input> => {
            return new Promise<Input>((resolve, reject) => {
                this.client.getInput(
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
        }, options?.limit, options?.silent);
    }

    async updateInput(input: Input, mask: FieldMask, options?: UnaryCallOptions): Promise<UpdateInputResponse> {
        return this.unaryCall<UpdateInputResponse>('Update Input', (): Promise<UpdateInputResponse> => {
            return new Promise<UpdateInputResponse>((resolve, reject) => {
                this.client.updateInput(
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
        }, options?.limit, options?.silent);
    }

    async removeInput(id: string, options?: UnaryCallOptions): Promise<RemoveInputResponse> {
        return this.unaryCall<RemoveInputResponse>('Remove Input', (): Promise<RemoveInputResponse> => {
            return new Promise<RemoveInputResponse>((resolve, reject) => {
                this.client.removeInput(
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
        }, options?.limit, options?.silent);
    }

}
