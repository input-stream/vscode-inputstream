import * as grpc from '@grpc/grpc-js';

import { ProtoGrpcType as AuthProtoType } from './proto/auth';
import { DeviceLoginRequest } from './proto/build/stack/auth/v1beta1/DeviceLoginRequest';
import { DeviceLoginResponse } from './proto/build/stack/auth/v1beta1/DeviceLoginResponse';
import { LoginRequest } from './proto/build/stack/auth/v1beta1/LoginRequest';
import { LoginResponse } from './proto/build/stack/auth/v1beta1/LoginResponse';
import { User } from './proto/build/stack/auth/v1beta1/User';

export class InMemoryAuthService {
    public users: Map<string, User> = new Map();

    // ===================== PUBLIC =====================

    public addTo(proto: AuthProtoType, server: grpc.Server): void {
        server.addService(proto.build.stack.auth.v1beta1.AuthService.service, {
            DeviceLogin: this.deviceLogin.bind(this),
            Login: this.login.bind(this),
        });
    }

    // ===================== PRIVATE =====================

    private login(call: grpc.ServerUnaryCall<LoginRequest, LoginResponse>, callback: grpc.sendUnaryData<LoginResponse>): void {
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

    private deviceLogin(call: grpc.ServerWritableStream<DeviceLoginRequest, DeviceLoginResponse>): void {
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

}
