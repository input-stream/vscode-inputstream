import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';

import { AccessTokenRefresher } from './loginController';
import { FieldMask } from './proto/google/protobuf/FieldMask';
import { Input } from './proto/build/stack/inputstream/v1beta1/Input';
import { InputFilterOptions } from './proto/build/stack/inputstream/v1beta1/InputFilterOptions';
import { InputsClient } from './proto/build/stack/inputstream/v1beta1/Inputs';
import { ListInputsResponse } from './proto/build/stack/inputstream/v1beta1/ListInputsResponse';
import { ReauthenticatingGrpcClient } from './authenticatingGrpcClient';
import { RemoveInputResponse } from './proto/build/stack/inputstream/v1beta1/RemoveInputResponse';
import { UnaryCallOptions } from './clients';
import { UpdateInputResponse } from './proto/build/stack/inputstream/v1beta1/UpdateInputResponse';


export interface IInputsClient {
    createInput(input: Input, options?: UnaryCallOptions): Promise<Input | undefined>;
    getInput(filter: InputFilterOptions, mask?: FieldMask, options?: UnaryCallOptions): Promise<Input | undefined>;
    listInputs(filter: InputFilterOptions, options?: UnaryCallOptions): Promise<Input[] | undefined>;
    updateInput(input: Input, mask: FieldMask, options?: UnaryCallOptions): Promise<UpdateInputResponse>;
    removeInput(id: string, options?: UnaryCallOptions): Promise<RemoveInputResponse>;
}

export class InputsGrpcClient extends ReauthenticatingGrpcClient<InputsClient> implements IInputsClient, vscode.Disposable {

    constructor(
        client: InputsClient,
        tokenRefresher?: AccessTokenRefresher,
    ) {
        super(client, tokenRefresher);
    }

    listInputs(filter: InputFilterOptions, options?: UnaryCallOptions): Promise<Input[] | undefined> {
        return this.unaryCall<Input[] | undefined>('List Inputs', (): Promise<Input[] | undefined> => {
            return new Promise<Input[]>((resolve, reject) => {
                const md = this.getGrpcMetadata();
                const deadline = this.getDeadline();

                this.client.listInputs(
                    {
                        filter: filter,
                        wantPrivate: true,
                    },
                    md,
                    { deadline },
                    (err: grpc.ServiceError | null, resp?: ListInputsResponse) => {
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

    createInput(input: Input, options?: UnaryCallOptions): Promise<Input | undefined> {
        return this.unaryCall<Input>('Create Input', (): Promise<Input> => {
            return new Promise<Input>((resolve, reject) => {
                const md = this.getGrpcMetadata();
                const deadline = this.getDeadline();
                this.client.createInput(
                    { input },
                    md,
                    { deadline },
                    (err: grpc.ServiceError | null, resp?: Input) => {
                        if (err) {
                            reject(this.handleError(err));
                        } else {
                            resolve(resp!);
                        }
                    });
            });
        }, options?.limit, options?.silent);
    }

    getInput(filter: InputFilterOptions, mask?: FieldMask, options?: UnaryCallOptions): Promise<Input | undefined> {
        return this.unaryCall<Input>('Get Input', (): Promise<Input> => {
            return new Promise<Input>((resolve, reject) => {
                this.client.getInput(
                    { filter, mask },
                    this.getGrpcMetadata(),
                    { deadline: this.getDeadline() },
                    (err: grpc.ServiceError | null, resp?: Input) => {
                        if (err) {
                            reject(this.handleError(err));
                        } else {
                            resolve(resp!);
                        }
                    });
            });
        }, options?.limit, options?.silent);
    }

    updateInput(input: Input, mask: FieldMask, options?: UnaryCallOptions): Promise<UpdateInputResponse> {
        return new Promise((resolve, reject) => {
            const md = this.getGrpcMetadata();
            const deadline = this.getDeadline();
            this.client.UpdateInput({ input, mask }, md, { deadline }, (err: grpc.ServiceError | null, resp?: UpdateInputResponse) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(resp!);
                }
            });
        });
    }

    updateInputAuth(input: Input, mask: FieldMask, options?: UnaryCallOptions): Promise<UpdateInputResponse> {
        return this.unaryCall<UpdateInputResponse>('Update Input', (): Promise<UpdateInputResponse> => {
            return new Promise<UpdateInputResponse>((resolve, reject) => {
                const md = this.getGrpcMetadata();
                const deadline = this.getDeadline();
                this.client.updateInput(
                    { input, mask },
                    md,
                    { deadline },
                    (err: grpc.ServiceError | null, resp?: UpdateInputResponse) => {
                        if (err) {
                            reject(this.handleError(err));
                        } else {
                            resolve(resp!);
                        }
                    });
            });
        }, options?.limit, options?.silent);
    }

    removeInput(id: string, options?: UnaryCallOptions): Promise<RemoveInputResponse> {
        return this.unaryCall<RemoveInputResponse>('Remove Input', (): Promise<RemoveInputResponse> => {
            return new Promise<RemoveInputResponse>((resolve, reject) => {
                const md = this.getGrpcMetadata();
                const deadline = this.getDeadline();
                this.client.removeInput(
                    { id },
                    md,
                    { deadline },
                    (err: grpc.ServiceError | null, resp?: RemoveInputResponse) => {
                        if (err) {
                            reject(this.handleError(err));
                        } else {
                            resolve(resp!);
                        }
                    });
            });
        }, options?.limit, options?.silent);
    }

    public dispose(): void {
        this.client.close();
    }

}
