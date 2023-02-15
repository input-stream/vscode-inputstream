import * as grpc from '@grpc/grpc-js';

import { InMemoryInputsService } from './inputsService';
import { InputsClient } from './proto/build/stack/inputstream/v1beta1/Inputs';
import { loadProtoPackage } from './grpc';
import { ProtoGrpcType as InputStreamProtoType } from './proto/inputstream';

export class InputsServer {
    proto: InputStreamProtoType;
    server: grpc.Server;
    service: InMemoryInputsService;
    _client: InputsClient | undefined;

    constructor(private host = '0.0.0.0', private port = '0') {
        this.proto = loadProtoPackage<InputStreamProtoType>('./proto/inputstream.proto');
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
