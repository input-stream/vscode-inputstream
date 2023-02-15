import * as grpc from '@grpc/grpc-js';

import { InMemoryAuthService } from "./authService";
import { describe, it } from "@jest/globals";
import { expect } from "chai";
import { User } from './proto/build/stack/auth/v1beta1/User';
import { DeviceLoginResponse } from './proto/build/stack/auth/v1beta1/DeviceLoginResponse';
import { AuthServer } from './authServer';

describe('InMemoryAuthService', () => {
    it('constructor', () => {
        const service = new InMemoryAuthService();
        expect(service).to.exist;
        expect(service.users).to.exist;
    });

    describe('server', () => {
        let auths: AuthServer;

        beforeEach(async () => {
            auths = new AuthServer();
            return auths.connect();
        });

        afterEach(() => {
            auths.server.forceShutdown();
        });

        it('ready', () => {
            expect(auths.server).to.exist;
            expect(auths.client).to.exist;
        });

        it('deviceLogin', async () => {
            auths.service.users.set(
                'octocat-jwt',
                { login: 'octocat' },
            );
            const md = new grpc.Metadata();
            const got = await new Promise<{ user: User, accessToken: string }>((resolve, reject) => {
                const call = auths.client.deviceLogin({ apiToken: 'octocat-jwt' });

                let accessToken: string | undefined;
                let user: User | null | undefined;

                call.on('data', (resp: DeviceLoginResponse) => {
                    if (resp.completed) {
                        accessToken = resp.accessToken;
                        user = resp.user;
                    }
                });

                call.on('status', (status: grpc.StatusObject) => {
                    if (status.code === grpc.status.OK) {
                        resolve({ user: user!, accessToken: accessToken! });
                    } else {
                        reject(status);
                    }
                });

                call.on('error', reject);
            });
            expect(got.user).to.deep.equal({ login: 'octocat' });
            expect(got.accessToken).to.equal('<accessToken!>');
        });

    });
});
