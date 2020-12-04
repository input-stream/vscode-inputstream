import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import { ListInputsResponse } from '../proto/build/stack/inputstream/v1beta1/ListInputsResponse';
import { Input } from '../proto/build/stack/inputstream/v1beta1/Input';
import { InputsClient } from '../proto/build/stack/inputstream/v1beta1/Inputs';
import { RemoveInputResponse } from '../proto/build/stack/inputstream/v1beta1/RemoveInputResponse';
import { ProtoGrpcType as inputstreamProtoGrpcType } from '../proto/inputstream';
import { GRPCClient } from './grpcclient';

grpc.setLogVerbosity(grpc.logVerbosity.DEBUG);

export class PsClient extends GRPCClient {
    private readonly inputService: InputsClient;

    constructor(
        readonly proto: inputstreamProtoGrpcType,
        readonly address: string,
        readonly token: string,
    ) {
        super(address);

        const v1beta1 = proto.build.stack.inputstream.v1beta1;
        const creds = this.getCredentials(address);
        this.inputService = this.add(new v1beta1.Inputs(address, creds));
    }

    httpURL(): string {
        const address = this.address;
        const scheme = address.endsWith(':443') ? 'https' : 'http';
        return `${scheme}://${address}`;
    }

    protected handleErrorUnavailable(err: grpc.ServiceError): grpc.ServiceError {
        vscode.window.showWarningMessage(
            `The API at ${this.address} is unavailable.  Please check that the tcp connection is still valid.`,
        );
        return err;
    }

    async listInputs(login: string): Promise<Input[] | undefined> {
        return new Promise<Input[]>((resolve, reject) => {
            this.inputService.listInputs(
                { login },
                this.getGrpcMetadata(),
                { deadline: this.getDeadline() },
                async (err?: grpc.ServiceError, resp?: ListInputsResponse) => {
                    if (err) {
                        reject(this.handleError(err));
                    } else {
                        resolve(resp?.input);
                    }
                });
        });
    }

    async createInput(login: string): Promise<Input | undefined> {
        return new Promise<Input>((resolve, reject) => {
            this.inputService.createInput(
                { login },
                this.getGrpcMetadata(),
                { deadline: this.getDeadline() },
                async (err?: grpc.ServiceError, resp?: Input) => {
                    if (err) {
                        reject(this.handleError(err));
                    } else {
                        resolve(resp);
                    }
                });
        });
    }

    async removeInput(login: string, id: string): Promise<RemoveInputResponse> {
        return new Promise<RemoveInputResponse>((resolve, reject) => {
            this.inputService.removeInput(
                { login, id },
                this.getGrpcMetadata(),
                { deadline: this.getDeadline() },
                async (err?: grpc.ServiceError, resp?: RemoveInputResponse) => {
                    if (err) {
                        reject(this.handleError(err));
                    } else {
                        resolve(resp);
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