// Original file: proto/inputstream.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { GetUserRequest as _build_stack_inputstream_v1beta1_GetUserRequest, GetUserRequest__Output as _build_stack_inputstream_v1beta1_GetUserRequest__Output } from '../../../../build/stack/inputstream/v1beta1/GetUserRequest';
import type { ListUsersRequest as _build_stack_inputstream_v1beta1_ListUsersRequest, ListUsersRequest__Output as _build_stack_inputstream_v1beta1_ListUsersRequest__Output } from '../../../../build/stack/inputstream/v1beta1/ListUsersRequest';
import type { ListUsersResponse as _build_stack_inputstream_v1beta1_ListUsersResponse, ListUsersResponse__Output as _build_stack_inputstream_v1beta1_ListUsersResponse__Output } from '../../../../build/stack/inputstream/v1beta1/ListUsersResponse';
import type { UpdateUserRequest as _build_stack_inputstream_v1beta1_UpdateUserRequest, UpdateUserRequest__Output as _build_stack_inputstream_v1beta1_UpdateUserRequest__Output } from '../../../../build/stack/inputstream/v1beta1/UpdateUserRequest';
import type { User as _build_stack_inputstream_v1beta1_User, User__Output as _build_stack_inputstream_v1beta1_User__Output } from '../../../../build/stack/inputstream/v1beta1/User';

export interface UsersClient extends grpc.Client {
  GetUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  GetUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  GetUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  GetUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  getUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  getUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  getUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  getUser(argument: _build_stack_inputstream_v1beta1_GetUserRequest, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  
  ListUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_ListUsersResponse__Output>): grpc.ClientUnaryCall;
  ListUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_ListUsersResponse__Output>): grpc.ClientUnaryCall;
  ListUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_ListUsersResponse__Output>): grpc.ClientUnaryCall;
  ListUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_ListUsersResponse__Output>): grpc.ClientUnaryCall;
  listUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_ListUsersResponse__Output>): grpc.ClientUnaryCall;
  listUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_ListUsersResponse__Output>): grpc.ClientUnaryCall;
  listUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_ListUsersResponse__Output>): grpc.ClientUnaryCall;
  listUsers(argument: _build_stack_inputstream_v1beta1_ListUsersRequest, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_ListUsersResponse__Output>): grpc.ClientUnaryCall;
  
  UpdateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  UpdateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  UpdateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  UpdateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  updateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  updateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  updateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  updateUser(argument: _build_stack_inputstream_v1beta1_UpdateUserRequest, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_User__Output>): grpc.ClientUnaryCall;
  
}

export interface UsersHandlers extends grpc.UntypedServiceImplementation {
  GetUser: grpc.handleUnaryCall<_build_stack_inputstream_v1beta1_GetUserRequest__Output, _build_stack_inputstream_v1beta1_User>;
  
  ListUsers: grpc.handleUnaryCall<_build_stack_inputstream_v1beta1_ListUsersRequest__Output, _build_stack_inputstream_v1beta1_ListUsersResponse>;
  
  UpdateUser: grpc.handleUnaryCall<_build_stack_inputstream_v1beta1_UpdateUserRequest__Output, _build_stack_inputstream_v1beta1_User>;
  
}

export interface UsersDefinition extends grpc.ServiceDefinition {
  GetUser: MethodDefinition<_build_stack_inputstream_v1beta1_GetUserRequest, _build_stack_inputstream_v1beta1_User, _build_stack_inputstream_v1beta1_GetUserRequest__Output, _build_stack_inputstream_v1beta1_User__Output>
  ListUsers: MethodDefinition<_build_stack_inputstream_v1beta1_ListUsersRequest, _build_stack_inputstream_v1beta1_ListUsersResponse, _build_stack_inputstream_v1beta1_ListUsersRequest__Output, _build_stack_inputstream_v1beta1_ListUsersResponse__Output>
  UpdateUser: MethodDefinition<_build_stack_inputstream_v1beta1_UpdateUserRequest, _build_stack_inputstream_v1beta1_User, _build_stack_inputstream_v1beta1_UpdateUserRequest__Output, _build_stack_inputstream_v1beta1_User__Output>
}
