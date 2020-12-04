// Original file: proto/inputstream.proto

import type * as grpc from '@grpc/grpc-js';
import type { CreateInputRequest as _build_stack_inputstream_v1beta1_CreateInputRequest, CreateInputRequest__Output as _build_stack_inputstream_v1beta1_CreateInputRequest__Output } from '../../../../build/stack/inputstream/v1beta1/CreateInputRequest';
import type { GetInputContentRequest as _build_stack_inputstream_v1beta1_GetInputContentRequest, GetInputContentRequest__Output as _build_stack_inputstream_v1beta1_GetInputContentRequest__Output } from '../../../../build/stack/inputstream/v1beta1/GetInputContentRequest';
import type { GetInputContentResponse as _build_stack_inputstream_v1beta1_GetInputContentResponse, GetInputContentResponse__Output as _build_stack_inputstream_v1beta1_GetInputContentResponse__Output } from '../../../../build/stack/inputstream/v1beta1/GetInputContentResponse';
import type { GetInputRequest as _build_stack_inputstream_v1beta1_GetInputRequest, GetInputRequest__Output as _build_stack_inputstream_v1beta1_GetInputRequest__Output } from '../../../../build/stack/inputstream/v1beta1/GetInputRequest';
import type { Input as _build_stack_inputstream_v1beta1_Input, Input__Output as _build_stack_inputstream_v1beta1_Input__Output } from '../../../../build/stack/inputstream/v1beta1/Input';
import type { ListInputsRequest as _build_stack_inputstream_v1beta1_ListInputsRequest, ListInputsRequest__Output as _build_stack_inputstream_v1beta1_ListInputsRequest__Output } from '../../../../build/stack/inputstream/v1beta1/ListInputsRequest';
import type { ListInputsResponse as _build_stack_inputstream_v1beta1_ListInputsResponse, ListInputsResponse__Output as _build_stack_inputstream_v1beta1_ListInputsResponse__Output } from '../../../../build/stack/inputstream/v1beta1/ListInputsResponse';
import type { RemoveInputRequest as _build_stack_inputstream_v1beta1_RemoveInputRequest, RemoveInputRequest__Output as _build_stack_inputstream_v1beta1_RemoveInputRequest__Output } from '../../../../build/stack/inputstream/v1beta1/RemoveInputRequest';
import type { RemoveInputResponse as _build_stack_inputstream_v1beta1_RemoveInputResponse, RemoveInputResponse__Output as _build_stack_inputstream_v1beta1_RemoveInputResponse__Output } from '../../../../build/stack/inputstream/v1beta1/RemoveInputResponse';

export interface InputsClient extends grpc.Client {
  CreateInput(argument: _build_stack_inputstream_v1beta1_CreateInputRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  CreateInput(argument: _build_stack_inputstream_v1beta1_CreateInputRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  CreateInput(argument: _build_stack_inputstream_v1beta1_CreateInputRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  CreateInput(argument: _build_stack_inputstream_v1beta1_CreateInputRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  createInput(argument: _build_stack_inputstream_v1beta1_CreateInputRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  createInput(argument: _build_stack_inputstream_v1beta1_CreateInputRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  createInput(argument: _build_stack_inputstream_v1beta1_CreateInputRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  createInput(argument: _build_stack_inputstream_v1beta1_CreateInputRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  
  GetInput(argument: _build_stack_inputstream_v1beta1_GetInputRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  GetInput(argument: _build_stack_inputstream_v1beta1_GetInputRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  GetInput(argument: _build_stack_inputstream_v1beta1_GetInputRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  GetInput(argument: _build_stack_inputstream_v1beta1_GetInputRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  getInput(argument: _build_stack_inputstream_v1beta1_GetInputRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  getInput(argument: _build_stack_inputstream_v1beta1_GetInputRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  getInput(argument: _build_stack_inputstream_v1beta1_GetInputRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  getInput(argument: _build_stack_inputstream_v1beta1_GetInputRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_Input__Output) => void): grpc.ClientUnaryCall;
  
  GetInputContent(argument: _build_stack_inputstream_v1beta1_GetInputContentRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_GetInputContentResponse__Output) => void): grpc.ClientUnaryCall;
  GetInputContent(argument: _build_stack_inputstream_v1beta1_GetInputContentRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_GetInputContentResponse__Output) => void): grpc.ClientUnaryCall;
  GetInputContent(argument: _build_stack_inputstream_v1beta1_GetInputContentRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_GetInputContentResponse__Output) => void): grpc.ClientUnaryCall;
  GetInputContent(argument: _build_stack_inputstream_v1beta1_GetInputContentRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_GetInputContentResponse__Output) => void): grpc.ClientUnaryCall;
  getInputContent(argument: _build_stack_inputstream_v1beta1_GetInputContentRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_GetInputContentResponse__Output) => void): grpc.ClientUnaryCall;
  getInputContent(argument: _build_stack_inputstream_v1beta1_GetInputContentRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_GetInputContentResponse__Output) => void): grpc.ClientUnaryCall;
  getInputContent(argument: _build_stack_inputstream_v1beta1_GetInputContentRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_GetInputContentResponse__Output) => void): grpc.ClientUnaryCall;
  getInputContent(argument: _build_stack_inputstream_v1beta1_GetInputContentRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_GetInputContentResponse__Output) => void): grpc.ClientUnaryCall;
  
  ListInputs(argument: _build_stack_inputstream_v1beta1_ListInputsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListInputsResponse__Output) => void): grpc.ClientUnaryCall;
  ListInputs(argument: _build_stack_inputstream_v1beta1_ListInputsRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListInputsResponse__Output) => void): grpc.ClientUnaryCall;
  ListInputs(argument: _build_stack_inputstream_v1beta1_ListInputsRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListInputsResponse__Output) => void): grpc.ClientUnaryCall;
  ListInputs(argument: _build_stack_inputstream_v1beta1_ListInputsRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListInputsResponse__Output) => void): grpc.ClientUnaryCall;
  listInputs(argument: _build_stack_inputstream_v1beta1_ListInputsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListInputsResponse__Output) => void): grpc.ClientUnaryCall;
  listInputs(argument: _build_stack_inputstream_v1beta1_ListInputsRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListInputsResponse__Output) => void): grpc.ClientUnaryCall;
  listInputs(argument: _build_stack_inputstream_v1beta1_ListInputsRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListInputsResponse__Output) => void): grpc.ClientUnaryCall;
  listInputs(argument: _build_stack_inputstream_v1beta1_ListInputsRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_ListInputsResponse__Output) => void): grpc.ClientUnaryCall;
  
  RemoveInput(argument: _build_stack_inputstream_v1beta1_RemoveInputRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_RemoveInputResponse__Output) => void): grpc.ClientUnaryCall;
  RemoveInput(argument: _build_stack_inputstream_v1beta1_RemoveInputRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_RemoveInputResponse__Output) => void): grpc.ClientUnaryCall;
  RemoveInput(argument: _build_stack_inputstream_v1beta1_RemoveInputRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_RemoveInputResponse__Output) => void): grpc.ClientUnaryCall;
  RemoveInput(argument: _build_stack_inputstream_v1beta1_RemoveInputRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_RemoveInputResponse__Output) => void): grpc.ClientUnaryCall;
  removeInput(argument: _build_stack_inputstream_v1beta1_RemoveInputRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_RemoveInputResponse__Output) => void): grpc.ClientUnaryCall;
  removeInput(argument: _build_stack_inputstream_v1beta1_RemoveInputRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_RemoveInputResponse__Output) => void): grpc.ClientUnaryCall;
  removeInput(argument: _build_stack_inputstream_v1beta1_RemoveInputRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_RemoveInputResponse__Output) => void): grpc.ClientUnaryCall;
  removeInput(argument: _build_stack_inputstream_v1beta1_RemoveInputRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_inputstream_v1beta1_RemoveInputResponse__Output) => void): grpc.ClientUnaryCall;
  
}

export interface InputsHandlers extends grpc.UntypedServiceImplementation {
  CreateInput: grpc.handleUnaryCall<_build_stack_inputstream_v1beta1_CreateInputRequest__Output, _build_stack_inputstream_v1beta1_Input>;
  
  GetInput: grpc.handleUnaryCall<_build_stack_inputstream_v1beta1_GetInputRequest__Output, _build_stack_inputstream_v1beta1_Input>;
  
  GetInputContent: grpc.handleUnaryCall<_build_stack_inputstream_v1beta1_GetInputContentRequest__Output, _build_stack_inputstream_v1beta1_GetInputContentResponse>;
  
  ListInputs: grpc.handleUnaryCall<_build_stack_inputstream_v1beta1_ListInputsRequest__Output, _build_stack_inputstream_v1beta1_ListInputsResponse>;
  
  RemoveInput: grpc.handleUnaryCall<_build_stack_inputstream_v1beta1_RemoveInputRequest__Output, _build_stack_inputstream_v1beta1_RemoveInputResponse>;
  
}
