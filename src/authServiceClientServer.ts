import * as grpc from '@grpc/grpc-js';

import { ProtoGrpcType as AuthProtoType } from './proto/auth';
import { InMemoryAuthService } from './authServiceServer';
import { loadAuthProtos } from './clients';
import { AuthServiceClient } from './proto/build/stack/auth/v1beta1/AuthService';


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

    // ===================== PUBLIC =====================

    public get client(): AuthServiceClient {
        return this._client!;
    }

    public async connect(): Promise<AuthServiceClient> {
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
                this._client!.waitForReady(deadline, (err: Error | undefined) => {
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
