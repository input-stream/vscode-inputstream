// Original file: proto/inputstream.proto

import type * as grpc from '@grpc/grpc-js'
import type { GetUserRequest as _build_stack_inputstream_v1beta1_GetUserRequest, GetUserRequest__Output as _build_stack_inputstream_v1beta1_GetUserRequest__Output } from '../../../../build/stack/inputstream/v1beta1/GetUserRequest';
import type { ListUsersRequest as _build_stack_inputstream_v1beta1_ListUsersRequest, ListUsersRequest__Output as _build_stack_inputstream_v1beta1_ListUsersRequest__Output } from '../../../../build/stack/inputstream/v1beta1/ListUsersRequest';
import type { ListUsersResponse as _build_stack_inputstream_v1beta1_ListUsersResponse, ListUsersResponse__Output as _build_stack_inputstream_v1beta1_ListUsersResponse__Output } from '../../../../build/stack/inputstream/v1beta1/ListUsersResponse';
import type { UpdateUserRequest as _build_stack_inputstream_v1beta1_UpdateUserRequest, UpdateUserRequest__Output as _build_stack_inputstream_v1beta1_UpdateUserRequest__Output } from '../../../../build/stack/inputstream/v1beta1/UpdateUserRequest';
import type { User as _build_stack_inputstream_v1beta1_User, User__Output as _build_stack_inputstream_v1beta1_User__Output } from '../../../../build/stack/inputstream/v1beta1/User';

export interface UsersClient extends grpc.Client {
  GetUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  GetUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  GetUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  GetUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  getUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  getUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  getUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  getUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  
  ListUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListUsersResponse__Output) => void): grpc.ClientUnaryCall;
  ListUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListUsersResponse__Output) => void): grpc.ClientUnaryCall;
  ListUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListUsersResponse__Output) => void): grpc.ClientUnaryCall;
  ListUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListUsersResponse__Output) => void): grpc.ClientUnaryCall;
  listUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListUsersResponse__Output) => void): grpc.ClientUnaryCall;
  listUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListUsersResponse__Output) => void): grpc.ClientUnaryCall;
  listUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListUsersResponse__Output) => void): grpc.ClientUnaryCall;
  listUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListUsersResponse__Output) => void): grpc.ClientUnaryCall;
  
  UpdateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  UpdateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  UpdateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  UpdateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  updateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  updateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  updateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  updateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_User__Output) => void): grpc.ClientUnaryCall;
  
}

export interface UsersHandlers extends grpc.UntypedServiceImplementation {
  GetUser: grpc.handleUnaryCall<_build_stack_inputstream_v1beta1_GetUserRequest__Output, _build_stack_inputstream_v1beta1_User>;
  
  ListUsers: grpc.handleUnaryCall<_build_stack_inputstream_v1beta1_ListUsersRequest__Output, _build_stack_inputstream_v1beta1_ListUsersResponse>;
  
  UpdateUser: grpc.handleUnaryCall<_build_stack_inputstream_v1beta1_UpdateUserRequest__Output, _build_stack_inputstream_v1beta1_User>;
  
}
