import { AuthServiceClient } from './proto/build/stack/auth/v1beta1/AuthService';
import { ByteStreamClient } from './proto/google/bytestream/ByteStream';
import { createChannelCredentials, ClientContext, createCredentials, createClientOptions } from './grpc';
import { ImagesClient } from './proto/build/stack/inputstream/v1beta1/Images';
import { InputsClient } from './proto/build/stack/inputstream/v1beta1/Inputs';
import { ProtoGrpcType as AuthProtoType } from './proto/auth';
import { ProtoGrpcType as ByteStreamProtoType } from './proto/bytestream';
import { ProtoGrpcType as InputStreamProtoType } from './proto/inputstream';

export function createAuthServiceClient(proto: AuthProtoType, address: string): AuthServiceClient {
    const creds = createChannelCredentials(address);
    return new proto.build.stack.auth.v1beta1.AuthService(address, creds);
}

export function createBytestreamClient(proto: ByteStreamProtoType, address: string, ctx: ClientContext): ByteStreamClient {
    const creds = createCredentials(address, ctx.accessToken);
    // NOTE: client interceptor does not work with streaming calls (or does it?)
    return new proto.google.bytestream.ByteStream(address, creds);
}

export function createImagesClient(proto: InputStreamProtoType, address: string, ctx: ClientContext): ImagesClient {
    const creds = createCredentials(address, ctx.accessToken);
    const options = createClientOptions(ctx);
    return new proto.build.stack.inputstream.v1beta1.Images(address, creds, options);
}

export function createInputsClient(proto: InputStreamProtoType, address: string, ctx: ClientContext): InputsClient {
    const creds = createCredentials(address, ctx.accessToken);
    const options = createClientOptions(ctx);
    return new proto.build.stack.inputstream.v1beta1.Inputs(address, creds, options);
}
