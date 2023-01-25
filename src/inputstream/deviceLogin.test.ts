
import { describe, it } from "@jest/globals";
import { expect } from "chai";
import { loadAuthProtos } from "./configuration";
import { AuthServiceClient } from '../proto/build/stack/auth/v1beta1/AuthService';
import { DeviceLogin } from "./deviceLogin";
import { createAuthServiceClient } from "../inputstream/configuration";

describe('DeviceLogin', () => {
    const proto = loadAuthProtos('proto/auth.proto');
    let client: AuthServiceClient;

    beforeEach(() => {
        client = createAuthServiceClient(proto, '0.0.0.0:0');
    });

    it('constructor', () => {
        const dl = new DeviceLogin(client);
        expect(dl).to.exist;
    });
});