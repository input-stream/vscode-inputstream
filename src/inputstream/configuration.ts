import * as grpc from '@grpc/grpc-js';
import * as loader from '@grpc/proto-loader';
import * as vscode from 'vscode';
import { resolveHome } from '../common';
import { ProtoGrpcType as AuthProtoType } from '../proto/auth';
import { AuthServiceClient } from '../proto/build/stack/auth/v1beta1/AuthService';
import { InputsClient } from '../proto/build/stack/inputstream/v1beta1/Inputs';
import { ProtoGrpcType as PsProtoType } from '../proto/inputstream';
import { ConfigSection } from './constants';

/**
 * Configuration for the inputstream feature.
 */
export type InputStreamConfiguration = {
    verbose: number,
    auth: AuthServerConfiguration,
    inputstream: InputStreamServerConfiguration,
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
 * Configuration for the license server integration.
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

    const cfg: InputStreamConfiguration = {
        verbose: config.get<number>(ConfigSection.Verbose, 0),
        auth: auth,
        inputstream: inputstream,
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

export function loadPsProtos(protofile: string): PsProtoType {
    const protoPackage = loader.loadSync(protofile, {
        keepCase: false,
        defaults: false,
        oneofs: true
    });
    return grpc.loadPackageDefinition(protoPackage) as unknown as PsProtoType;
}

function getGRPCCredentials(address: string): grpc.ChannelCredentials {
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
export function createInputsClient(proto: PsProtoType, address: string): InputsClient {
    return new proto.build.stack.inputstream.v1beta1.Inputs(address, getGRPCCredentials(address));
}

/**
 * Create a new client for the Auth service.
 * 
 * @param address The address to connect.
 */
export function createAuthServiceClient(proto: AuthProtoType, address: string): AuthServiceClient {
    return new proto.build.stack.auth.v1beta1.AuthService(address, getGRPCCredentials(address));
}

