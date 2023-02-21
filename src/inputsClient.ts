import * as grpc from '@grpc/grpc-js';

import { FieldMask } from './proto/google/protobuf/FieldMask';
import { Input } from './proto/build/stack/inputstream/v1beta1/Input';
import { InputFilterOptions } from './proto/build/stack/inputstream/v1beta1/InputFilterOptions';
import { InputsClient } from './proto/build/stack/inputstream/v1beta1/Inputs';
import { ListInputsResponse } from './proto/build/stack/inputstream/v1beta1/ListInputsResponse';
import { RemoveInputResponse } from './proto/build/stack/inputstream/v1beta1/RemoveInputResponse';
import { UpdateInputResponse } from './proto/build/stack/inputstream/v1beta1/UpdateInputResponse';
import { createDeadline, GrpcClient } from './grpc';


export interface IInputsClient {
    createInput(input: Input): Promise<Input | undefined>;
    getInput(filter: InputFilterOptions, mask?: FieldMask): Promise<Input | undefined>;
    listInputs(filter: InputFilterOptions): Promise<Input[] | undefined>;
    updateInput(input: Input, mask: FieldMask): Promise<UpdateInputResponse>;
    removeInput(id: string): Promise<RemoveInputResponse>;
}

export class InputsGrpcNodeClient extends GrpcClient<InputsClient> implements IInputsClient {
    constructor(
        client: InputsClient,
    ) {
        super(client);
    }

    listInputs(filter: InputFilterOptions): Promise<Input[] | undefined> {
        return new Promise<Input[]>((resolve, reject) => {
            this.client.listInputs(
                {
                    filter: filter,
                    wantPrivate: true,
                },
                { deadline: createDeadline() },
                (err: grpc.ServiceError | null, resp?: ListInputsResponse) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(resp!.input!);
                    }
                });
        });
    }

    createInput(input: Input): Promise<Input | undefined> {
        return new Promise<Input>((resolve, reject) => {
            this.client.createInput(
                { input },
                { deadline: createDeadline() },
                (err: grpc.ServiceError | null, resp?: Input) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(resp!);
                    }
                });
        });
    }

    getInput(filter: InputFilterOptions, mask?: FieldMask): Promise<Input | undefined> {
        return new Promise<Input>((resolve, reject) => {
            this.client.getInput(
                { filter, mask },
                { deadline: createDeadline() },
                (err: grpc.ServiceError | null, resp?: Input) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(resp!);
                    }
                });
        });
    }

    updateInput(input: Input, mask: FieldMask): Promise<UpdateInputResponse> {
        return new Promise((resolve, reject) => {
            this.client.UpdateInput(
                { input, mask },
                { deadline: createDeadline() },
                (err: grpc.ServiceError | null, resp?: UpdateInputResponse) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(resp!);
                    }
                });
        });
    }

    removeInput(id: string): Promise<RemoveInputResponse> {
        return new Promise<RemoveInputResponse>((resolve, reject) => {
            this.client.removeInput(
                { id },
                { deadline: createDeadline() },
                (err: grpc.ServiceError | null, resp?: RemoveInputResponse) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(resp!);
                    }
                });
        });
    }

}

export class InputsGrpcWebClient implements IInputsClient {
    constructor(
    ) {
    }

    listInputs(filter: InputFilterOptions): Promise<Input[] | undefined> {
        throw new Error('unimplemented');
    }

    createInput(input: Input): Promise<Input | undefined> {
        throw new Error('unimplemented');
    }

    getInput(filter: InputFilterOptions, mask?: FieldMask): Promise<Input | undefined> {
        throw new Error('unimplemented');
    }

    updateInput(input: Input, mask: FieldMask): Promise<UpdateInputResponse> {
        throw new Error('unimplemented');
    }

    removeInput(id: string): Promise<RemoveInputResponse> {
        throw new Error('unimplemented');
    }

}
