import path from "path/posix";
import { WorkspaceConfiguration } from "vscode";

export const ExtensionID = 'stackbuild.vscode-inputstream';
export const ExtensionName = 'vscode-inputstream';
export const ConfigName = 'input.stream';

export enum ConfigSection {
    AuthProto = 'auth.proto',
    BytestreamProto = 'bytestream.proto',
    inputstreamProto = 'inputstream.proto',
    ApiAddress = 'api.address',
    Verbose = 'verbose',
    BaseURL = 'baseURL',
    BaseDir = 'baseDir',
}

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

/**
 * Values used as keys in vscode memento API.
 */
export enum MementoName {
    DeviceLoginResponse = 'input.stream.api.DeviceLoginResponse',
    LoginResponse = 'input.stream.api.LoginResponse',
}

export function createInputStreamConfiguration(
    asAbsolutePath: (rel: string) => string,
    config: WorkspaceConfiguration): InputStreamConfiguration {
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

export function resolveHome(filepath: string) {
    if (filepath[0] === '~') {
        return path.join(process.env.HOME!, filepath.slice(1));
    }
    return filepath;
}
