// Original file: proto/auth.proto

import type * as grpc from '@grpc/grpc-js'
import type { DeviceLoginRequest as _build_stack_auth_v1beta1_DeviceLoginRequest, DeviceLoginRequest__Output as _build_stack_auth_v1beta1_DeviceLoginRequest__Output } from '../../../../build/stack/auth/v1beta1/DeviceLoginRequest';
import type { DeviceLoginResponse as _build_stack_auth_v1beta1_DeviceLoginResponse, DeviceLoginResponse__Output as _build_stack_auth_v1beta1_DeviceLoginResponse__Output } from '../../../../build/stack/auth/v1beta1/DeviceLoginResponse';
import type { LoginRequest as _build_stack_auth_v1beta1_LoginRequest, LoginRequest__Output as _build_stack_auth_v1beta1_LoginRequest__Output } from '../../../../build/stack/auth/v1beta1/LoginRequest';
import type { LoginResponse as _build_stack_auth_v1beta1_LoginResponse, LoginResponse__Output as _build_stack_auth_v1beta1_LoginResponse__Output } from '../../../../build/stack/auth/v1beta1/LoginResponse';

export interface AuthServiceClient extends grpc.Client {
  DeviceLogin(argument: _build_stack_auth_v1beta1_DeviceLoginRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_build_stack_auth_v1beta1_DeviceLoginResponse__Output>;
  DeviceLogin(argument: _build_stack_auth_v1beta1_DeviceLoginRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_build_stack_auth_v1beta1_DeviceLoginResponse__Output>;
  deviceLogin(argument: _build_stack_auth_v1beta1_DeviceLoginRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_build_stack_auth_v1beta1_DeviceLoginResponse__Output>;
  deviceLogin(argument: _build_stack_auth_v1beta1_DeviceLoginRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_build_stack_auth_v1beta1_DeviceLoginResponse__Output>;
  
  Login(argument: _build_stack_auth_v1beta1_LoginRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_auth_v1beta1_LoginResponse__Output) => void): grpc.ClientUnaryCall;
  Login(argument: _build_stack_auth_v1beta1_LoginRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_auth_v1beta1_LoginResponse__Output) => void): grpc.ClientUnaryCall;
  Login(argument: _build_stack_auth_v1beta1_LoginRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_auth_v1beta1_LoginResponse__Output) => void): grpc.ClientUnaryCall;
  Login(argument: _build_stack_auth_v1beta1_LoginRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_auth_v1beta1_LoginResponse__Output) => void): grpc.ClientUnaryCall;
  login(argument: _build_stack_auth_v1beta1_LoginRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_auth_v1beta1_LoginResponse__Output) => void): grpc.ClientUnaryCall;
  login(argument: _build_stack_auth_v1beta1_LoginRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_auth_v1beta1_LoginResponse__Output) => void): grpc.ClientUnaryCall;
  login(argument: _build_stack_auth_v1beta1_LoginRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_auth_v1beta1_LoginResponse__Output) => void): grpc.ClientUnaryCall;
  login(argument: _build_stack_auth_v1beta1_LoginRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_auth_v1beta1_LoginResponse__Output) => void): grpc.ClientUnaryCall;
  
}

export interface AuthServiceHandlers extends grpc.UntypedServiceImplementation {
  DeviceLogin: grpc.handleServerStreamingCall<_build_stack_auth_v1beta1_DeviceLoginRequest__Output, _build_stack_auth_v1beta1_DeviceLoginResponse>;
  
  Login: grpc.handleUnaryCall<_build_stack_auth_v1beta1_LoginRequest__Output, _build_stack_auth_v1beta1_LoginResponse>;
  
}
