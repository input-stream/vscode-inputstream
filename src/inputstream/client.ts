import * as grpc from '@grpc/grpc-js';
import * as vscode from 'vscode';
import { ListInputsResponse } from '../proto/build/stack/inputstream/v1beta1/ListInputsResponse';
import { Input } from '../proto/build/stack/inputstream/v1beta1/Input';
import { InputsClient } from '../proto/build/stack/inputstream/v1beta1/Inputs';
import { RemoveInputResponse } from '../proto/build/stack/inputstream/v1beta1/RemoveInputResponse';
import { ProtoGrpcType as inputstreamProtoGrpcType } from '../proto/inputstream';
import { GRPCClient } from './grpcclient';
import { FieldMask } from '../proto/google/protobuf/FieldMask';
import { ButtonName, CommandName } from './constants';
import { ListInputsRequest } from '../proto/build/stack/inputstream/v1beta1/ListInputsRequest';

grpc.setLogVerbosity(grpc.logVerbosity.DEBUG);

export class PsClient extends GRPCClient {
    private readonly inputService: InputsClient;

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
    }

    httpURL(): string {
        const address = this.address;
        const scheme = address.endsWith(':443') ? 'https' : 'http';
        return `${scheme}://${address}`;
    }

    // protected handleErrorUnavailable(err: grpc.ServiceError): grpc.ServiceError {
    //     vscode.window.showWarningMessage(
    //         `The API at ${this.address} is unavailable.  Please check that the tcp connection is still valid.`,
    //     );
    //     return err;
    // }

    // /**
    //  * 
    //  * @param err Attempt to 
    //  */
    // protected handleErrorUnauthenticated(err: grpc.ServiceError): grpc.ServiceError {
    //     vscode.commands.executeCommand(CommandName.Login);
    //     return err;
    // }

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
        } catch (e: any) {
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
                } catch (e2: any) {
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

    async listInputs(login: string): Promise<Input[] | undefined> {
        return this.unaryCall<Input[] | undefined>('List Inputs', (): Promise<Input[] | undefined> => {
            return new Promise<Input[]>((resolve, reject) => {
                if (false) {
                    reject({
                        message: 'UNAUTHENTICATED: WIP',
                        code: grpc.status.UNAUTHENTICATED,
                        details: 'WIP',
                        metadata: new grpc.Metadata(),
                    } as grpc.ServiceError);
                }
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
        });
    }

    async createInput(input: Input): Promise<Input | undefined> {
        return this.unaryCall<Input>('Create Input', (): Promise<Input> => {
            return new Promise<Input>((resolve, reject) => {
                this.inputService.createInput(
                    { input },
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
        });
    }

    async getInput(login: string, id: string, mask?: FieldMask): Promise<Input | undefined> {
        return this.unaryCall<Input>('Get Input', (): Promise<Input> => {
            return new Promise<Input>((resolve, reject) => {
                this.inputService.getInput(
                    { login, id, mask },
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
        });
    }

    async updateInput(input: Input, mask: FieldMask): Promise<Input> {
        return this.unaryCall<Input>('Update Input', (): Promise<Input> => {
            return new Promise<Input>((resolve, reject) => {
                this.inputService.updateInput(
                    { input, mask },
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
        });
    }

    async removeInput(login: string, id: string): Promise<RemoveInputResponse> {
        return this.unaryCall<Input>('Remove Input', (): Promise<Input> => {
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
