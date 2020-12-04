// Original file: proto/auth.proto

import type * as grpc from '@grpc/grpc-js'
import type { DeviceLoginRequest as _build_stack_auth_v1beta1_DeviceLoginRequest, DeviceLoginRequest__Output as _build_stack_auth_v1beta1_DeviceLoginRequest__Output } from '../../../../build/stack/auth/v1beta1/DeviceLoginRequest';
import type { DeviceLoginResponse as _build_stack_auth_v1beta1_DeviceLoginResponse, DeviceLoginResponse__Output as _build_stack_auth_v1beta1_DeviceLoginResponse__Output } from '../../../../build/stack/auth/v1beta1/DeviceLoginResponse';

export interface AuthServiceClient extends grpc.Client {
  DeviceLogin(argument: _build_stack_auth_v1beta1_DeviceLoginRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_build_stack_auth_v1beta1_DeviceLoginResponse__Output>;
  DeviceLogin(argument: _build_stack_auth_v1beta1_DeviceLoginRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_build_stack_auth_v1beta1_DeviceLoginResponse__Output>;
  deviceLogin(argument: _build_stack_auth_v1beta1_DeviceLoginRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_build_stack_auth_v1beta1_DeviceLoginResponse__Output>;
  deviceLogin(argument: _build_stack_auth_v1beta1_DeviceLoginRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_build_stack_auth_v1beta1_DeviceLoginResponse__Output>;
  
}

export interface AuthServiceHandlers extends grpc.UntypedServiceImplementation {
  DeviceLogin: grpc.handleServerStreamingCall<_build_stack_auth_v1beta1_DeviceLoginRequest__Output, _build_stack_auth_v1beta1_DeviceLoginResponse>;
  
}
