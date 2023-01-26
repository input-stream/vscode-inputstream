import * as grpc from '@grpc/grpc-js';

import { CreateInputRequest } from './proto/build/stack/inputstream/v1beta1/CreateInputRequest';
import { GetInputRequest } from './proto/build/stack/inputstream/v1beta1/GetInputRequest';
import { Input } from './proto/build/stack/inputstream/v1beta1/Input';
import { InputsClient } from './proto/build/stack/inputstream/v1beta1/Inputs';
import { ListInputsRequest } from './proto/build/stack/inputstream/v1beta1/ListInputsRequest';
import { ListInputsResponse } from './proto/build/stack/inputstream/v1beta1/ListInputsResponse';
import { loadInputStreamProtos } from './clients';
import { ProtoGrpcType as InputStreamProtoType } from './proto/inputstream';
import { RemoveInputRequest } from './proto/build/stack/inputstream/v1beta1/RemoveInputRequest';
import { RemoveInputResponse } from './proto/build/stack/inputstream/v1beta1/RemoveInputResponse';
import { UpdateInputRequest } from './proto/build/stack/inputstream/v1beta1/UpdateInputRequest';
import { UpdateInputResponse } from './proto/build/stack/inputstream/v1beta1/UpdateInputResponse';
import { WatchInputRequest } from './proto/build/stack/inputstream/v1beta1/WatchInputRequest';


export class InMemoryInputsService {
    public data: Map<string, Input> = new Map();

    createInput(call: grpc.ServerUnaryCall<CreateInputRequest, Input>, callback: grpc.sendUnaryData<Input>): void {
        const input = call.request.input;
        if (!input) {
            callback(new grpc.StatusBuilder().withCode(grpc.status.INVALID_ARGUMENT).build());
            return;
        }
        if (input.id) {
            this.data.set(input.id, input!);
        }
        if (input.title) {
            this.data.set(input.title, input!);
        }
        if (input.titleSlug) {
            this.data.set(input.titleSlug, input!);
        }
        callback(null, input);
    }

    getInput(call: grpc.ServerUnaryCall<GetInputRequest, Input>, callback: grpc.sendUnaryData<Input>): void {
        let key: string | undefined;
        if (call.request.filter?.id) {
            key = call.request.filter?.id;
        } else if (call.request.filter?.title) {
            key = call.request.filter?.title;
        } else if (call.request.filter?.titleSlug) {
            key = call.request.filter?.titleSlug;
        }
        if (!key) {
            callback(new grpc.StatusBuilder().withCode(grpc.status.NOT_FOUND).build());
            return;
        }
        const input = this.data.get(key);
        if (!input) {
            callback(new grpc.StatusBuilder().withCode(grpc.status.NOT_FOUND).build());
            return;
        }
        callback(null, input);
    }

    listInputs(call: grpc.ServerUnaryCall<ListInputsRequest, Input>, callback: grpc.sendUnaryData<ListInputsResponse>): void {
        let inputs = Array.from(this.data.values());
        if (call.request.filter?.id) {
            inputs = inputs.filter(i => i.id === call.request.filter!.id);
        }
        if (call.request.filter?.login) {
            inputs = inputs.filter(i => i.login === call.request.filter!.login);
        }
        if (call.request.filter?.status) {
            inputs = inputs.filter(i => i.status === call.request.filter!.status);
        }
        if (call.request.filter?.title) {
            inputs = inputs.filter(i => i.status === call.request.filter!.title);
        }
        if (call.request.filter?.titleSlug) {
            inputs = inputs.filter(i => i.status === call.request.filter!.titleSlug);
        }
        callback(null, { input: inputs });
    }

    removeInput(call: grpc.ServerUnaryCall<RemoveInputRequest, Input>, callback: grpc.sendUnaryData<RemoveInputResponse>): void {
        if (!call.request.id) {
            callback(new grpc.StatusBuilder().withCode(grpc.status.INVALID_ARGUMENT).build());
            return;
        }
        if (!this.data.has(call.request.id)) {
            callback(new grpc.StatusBuilder().withCode(grpc.status.NOT_FOUND).build());
            return;
        }
        this.data.delete(call.request.id);
        callback(null, {});
    }

    updateInput(call: grpc.ServerUnaryCall<UpdateInputRequest, Input>, callback: grpc.sendUnaryData<UpdateInputResponse>): void {
        if (!call.request.input?.id) {
            callback(new grpc.StatusBuilder().withCode(grpc.status.INVALID_ARGUMENT).build());
            return;
        }
        const input = this.data.get(call.request.input.id);
        if (!input) {
            callback(new grpc.StatusBuilder().withCode(grpc.status.NOT_FOUND).build());
            return;
        }
        this.data.set(input.id!, input);
        callback(null, { input });
    }

    watchInput(call: grpc.ServerWritableStream<WatchInputRequest, Input>): void {
        const status = new grpc.StatusBuilder().withCode(grpc.status.UNIMPLEMENTED).build();
        call.emit('status', status);
        call.end();
    }

    get implementation(): grpc.UntypedServiceImplementation {
        return {
            CreateInput: this.createInput.bind(this),
            GetInput: this.getInput.bind(this),
            ListInputs: this.listInputs.bind(this),
            RemoveInput: this.removeInput.bind(this),
            UpdateInput: this.updateInput.bind(this),
            WatchInput: this.watchInput.bind(this),
        };
    }

    addTo(proto: InputStreamProtoType, server: grpc.Server): void {
        server.addService(proto.build.stack.inputstream.v1beta1.Inputs.service, this.implementation);
    }
}

export class InputsClientServer {
    proto: InputStreamProtoType;
    server: grpc.Server;
    service: InMemoryInputsService;
    _client: InputsClient | undefined;

    constructor(private host = '0.0.0.0', private port = '0') {
        this.proto = loadInputStreamProtos('./proto/inputstream.proto');
        this.service = new InMemoryInputsService();
        this.server = new grpc.Server();
        this.service.addTo(this.proto, this.server);
    }

    get client(): InputsClient {
        return this._client!;
    }

    async connect(): Promise<InputsClient> {
        return new Promise<InputsClient>((resolve, reject) => {
            this.server.bindAsync(`${this.host}:${this.port}`, grpc.ServerCredentials.createInsecure(), (err: Error | null, port: number) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.server.start();

                this._client = new this.proto.build.stack.inputstream.v1beta1.Inputs(
                    `${this.host}:${port}`,
                    grpc.credentials.createInsecure());
                const deadline = new Date();
                deadline.setSeconds(deadline.getSeconds() + 2);
                this._client.waitForReady(deadline, (err: Error | undefined) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(this._client!);
                });
            });
        });
    }
}
