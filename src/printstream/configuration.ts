import * as grpc from '@grpc/grpc-js';
import * as loader from '@grpc/proto-loader';
import * as vscode from 'vscode';
import { ProtoGrpcType as AuthProtoType } from '../proto/auth';
import { AuthServiceClient } from '../proto/build/stack/auth/v1beta1/AuthService';
import { PostsClient } from '../proto/build/stack/printstream/v1beta1/Posts';
import { ProtoGrpcType as PsProtoType } from '../proto/printstream';
import { ConfigSection } from './constants';

/**
 * Configuration for the Printstream feature.
 */
export type PsConfiguration = {
    verbose: number,
    auth: AuthServerConfiguration,
    printstream: PsServerConfiguration,
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
export type PsServerConfiguration = {
    // filename of the license.proto file.
    protofile: string,
    // address of the api server
    address: string,
};

export async function createPsConfiguration(
    asAbsolutePath: (rel: string) => string,
    storagePath: string,
    config: vscode.WorkspaceConfiguration): Promise<PsConfiguration> {
    const printstream: PsServerConfiguration = {
        protofile: config.get<string>(ConfigSection.PrintstreamProto,
            asAbsolutePath('./proto/printstream.proto')),
        address: config.get<string>(ConfigSection.ApiAddress,
            'api.print.stream:443'),
    };

    const auth = {
        protofile: config.get<string>(ConfigSection.AuthProto,
            asAbsolutePath('./proto/auth.proto')),
        address: config.get<string>(ConfigSection.ApiAddress,
            'print.stream:443'),
    };

    const cfg: PsConfiguration = {
        verbose: config.get<number>(ConfigSection.Verbose, 0),
        auth: auth,
        printstream: printstream,
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
 * Create a new client for the Posts service.
 * 
 * @param address The address to connect.
 */
export function createPostsClient(proto: PsProtoType, address: string): PostsClient {
    return new proto.build.stack.printstream.v1beta1.Posts(address, getGRPCCredentials(address));
}

/**
 * Create a new client for the Auth service.
 * 
 * @param address The address to connect.
 */
export function createAuthServiceClient(proto: AuthProtoType, address: string): AuthServiceClient {
    return new proto.build.stack.auth.v1beta1.AuthService(address, getGRPCCredentials(address));
}

