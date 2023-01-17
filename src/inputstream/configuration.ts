import * as grpc from '@grpc/grpc-js';
import * as loader from '@grpc/proto-loader';
import * as vscode from 'vscode';
import { resolveHome } from '../common';
import { ProtoGrpcType as AuthProtoType } from '../proto/auth';
import { AuthServiceClient } from '../proto/build/stack/auth/v1beta1/AuthService';
import { InputsClient } from '../proto/build/stack/inputstream/v1beta1/Inputs';
import { ProtoGrpcType as ByteStreamProtoType } from '../proto/bytestream';
import { ProtoGrpcType as InputStreamProtoType } from '../proto/inputstream';
import { ConfigSection } from './constants';

/**
 * Configuration for the inputstream feature.
 */
export type InputStreamConfiguration = {
    verbose: number,
    auth: AuthServerConfiguration,
    inputstream: InputStreamServerConfiguration,
    bytestream: ByteStreamServerConfiguration,
};

/**
 * Configuration for the auth server integration.
 */
export type AuthServerConfiguration = {
    // filename of the license.proto file.
    protofile: string,
    // address of the license server
    address: string,
};

/**
 * Configuration for the inputstream server integration.
 */
export type InputStreamServerConfiguration = {
    // filename of the license.proto file.
    protofile: string,
    // address of the api server
    address: string,
    // base URL where the website lives
    baseURL: string,
    // base directory where to store files
    baseDir: string,
};

/**
 * Configuration for the bytestream server integration.
 */
export type ByteStreamServerConfiguration = {
    // filename of the license.proto file.
    protofile: string,
    // address of the api server
    address: string,
};

export async function createInputStreamConfiguration(
    asAbsolutePath: (rel: string) => string,
    storagePath: string,
    config: vscode.WorkspaceConfiguration): Promise<InputStreamConfiguration> {
    const inputstream: InputStreamServerConfiguration = {
        protofile: config.get<string>(ConfigSection.inputstreamProto,
            asAbsolutePath('./proto/inputstream.proto')),
        address: config.get<string>(ConfigSection.ApiAddress,
            'api.input.stream:443'),
        baseURL: resolveHome(config.get<string>(ConfigSection.BaseURL,
            'https://input.stream')),
        baseDir: resolveHome(config.get<string>(ConfigSection.BaseDir,
            '~/.inputstream')),
    };

    const auth = {
        protofile: config.get<string>(ConfigSection.AuthProto,
            asAbsolutePath('./proto/auth.proto')),
        address: config.get<string>(ConfigSection.ApiAddress,
            'input.stream:443'),
    };

    const bytestream = {
        protofile: config.get<string>(ConfigSection.BytestreamProto,
            asAbsolutePath('./proto/bytestream.proto')),
        address: config.get<string>(ConfigSection.ApiAddress,
            'input.stream:443'),
    };

    const cfg: InputStreamConfiguration = {
        verbose: config.get<number>(ConfigSection.Verbose, 0),
        auth: auth,
        inputstream: inputstream,
        bytestream: bytestream,
    };

    return cfg;
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

