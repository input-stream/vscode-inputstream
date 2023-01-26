import * as grpc from '@grpc/grpc-js';
import * as loader from '@grpc/proto-loader';

import { ProtoGrpcType as AuthProtoType } from './proto/auth';
import { AuthServiceClient } from './proto/build/stack/auth/v1beta1/AuthService';
import { InputsClient } from './proto/build/stack/inputstream/v1beta1/Inputs';
import { ProtoGrpcType as ByteStreamProtoType } from './proto/bytestream';
import { ProtoGrpcType as InputStreamProtoType } from './proto/inputstream';

export type UnaryCallOptions = {
    limit: number;
    silent: boolean;
}

export function loadAuthProtos(protofile: string): AuthProtoType {
    const protoPackage = loader.loadSync(protofile, {
        keepCase: false,
        defaults: false,
        oneofs: true
    });
    return grpc.loadPackageDefinition(protoPackage) as unknown as AuthProtoType;
}

export function loadInputStreamProtos(protofile: string): InputStreamProtoType {
    const protoPackage = loader.loadSync(protofile, {
        keepCase: false,
        defaults: false,
        oneofs: true
    });
    return grpc.loadPackageDefinition(protoPackage) as unknown as InputStreamProtoType;
}

export function loadByteStreamProtos(protofile: string): ByteStreamProtoType {
    const protoPackage = loader.loadSync(protofile, {
        keepCase: false,
        defaults: false,
        oneofs: true
    });
    return grpc.loadPackageDefinition(protoPackage) as unknown as ByteStreamProtoType;
}

function getChannelCredentials(address: string): grpc.ChannelCredentials {
    if (address.endsWith(':443')) {
        return grpc.credentials.createSsl();
    }
    return grpc.credentials.createInsecure();
}

/**
 * Create a new client for the Inputs service.
 * 
 * @param address The address to connect.
 */
export function createInputsClient(proto: InputStreamProtoType, address: string): InputsClient {
    return new proto.build.stack.inputstream.v1beta1.Inputs(address, getChannelCredentials(address));
}

/**
 * Create a new client for the Auth service.
 * 
 * @param address The address to connect.
 */
export function createAuthServiceClient(proto: AuthProtoType, address: string): AuthServiceClient {
    return new proto.build.stack.auth.v1beta1.AuthService(address, getChannelCredentials(address));
}
