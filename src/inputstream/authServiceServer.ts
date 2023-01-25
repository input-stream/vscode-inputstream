import * as grpc from '@grpc/grpc-js';

import { loadAuthProtos } from './configuration';
import { AuthServiceClient } from '../proto/build/stack/auth/v1beta1/AuthService';
import { ProtoGrpcType as AuthProtoType } from '../proto/auth';
import { LoginRequest } from '../proto/build/stack/auth/v1beta1/LoginRequest';
import { LoginResponse } from '../proto/build/stack/auth/v1beta1/LoginResponse';
import { User } from '../proto/build/stack/auth/v1beta1/User';
import { DeviceLoginRequest } from '../proto/build/stack/auth/v1beta1/DeviceLoginRequest';
import { DeviceLoginResponse } from '../proto/build/stack/auth/v1beta1/DeviceLoginResponse';

export class InMemoryAuthService {
    public users: Map<string, User> = new Map();

    login(call: grpc.ServerUnaryCall<LoginRequest, LoginResponse>, callback: grpc.sendUnaryData<LoginResponse>): void {
        const user = this.users.get(call.request.token!);
        if (!user) {
            callback(new grpc.StatusBuilder().withCode(grpc.status.NOT_FOUND).build());
            return;
        }
        callback(null, {
            user,
            token: '<token!>',
            expiresAt: { seconds: (Date.now() / 1000) + 30 },
        });
    }

    deviceLogin(call: grpc.ServerWritableStream<DeviceLoginRequest, DeviceLoginResponse>): void {
        const user = this.users.get(call.request.apiToken!);
        if (!user) {
            const status = new grpc.StatusBuilder().withCode(grpc.status.NOT_FOUND).build();
            call.emit('status', status);
            call.end();
            return;
        }

        call.write({
            oauthUrl: `https://input.stream/github_login`,
            completed: false,
        });

        call.write({
            user,
            completed: true,
            accessToken: '<accessToken!>',
            apiToken: '<apiToken!>',
            expiresAt: { seconds: (Date.now() / 1000) + 30 },
        });

        call.end();
    }

    get implementation(): grpc.UntypedServiceImplementation {
        return {
            DeviceLogin: this.deviceLogin.bind(this),
            Login: this.login.bind(this),
        };
    }

    addTo(proto: AuthProtoType, server: grpc.Server): void {
        server.addService(proto.build.stack.auth.v1beta1.AuthService.service, this.implementation);
    }
}

export class AuthClientServer {
    proto: AuthProtoType;
    server: grpc.Server;
    service: InMemoryAuthService;
    _client: AuthServiceClient | undefined;

    constructor(private host = '0.0.0.0', private port = '0') {
        this.proto = loadAuthProtos('./proto/auth.proto');
        this.service = new InMemoryAuthService();
        this.server = new grpc.Server();
        this.service.addTo(this.proto, this.server);
    }

    get client(): AuthServiceClient {
        return this._client!;
    }

    async connect(): Promise<AuthServiceClient> {
        return new Promise<AuthServiceClient>((resolve, reject) => {
            this.server.bindAsync(`${this.host}:${this.port}`, grpc.ServerCredentials.createInsecure(), (err: Error | null, port: number) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.server.start();

                this._client = new this.proto.build.stack.auth.v1beta1.AuthService(
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
