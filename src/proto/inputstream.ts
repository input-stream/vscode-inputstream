import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { ImagesClient as _build_stack_inputstream_v1beta1_ImagesClient, ImagesDefinition as _build_stack_inputstream_v1beta1_ImagesDefinition } from './build/stack/inputstream/v1beta1/Images';
import type { InputsClient as _build_stack_inputstream_v1beta1_InputsClient, InputsDefinition as _build_stack_inputstream_v1beta1_InputsDefinition } from './build/stack/inputstream/v1beta1/Inputs';
import type { UsersClient as _build_stack_inputstream_v1beta1_UsersClient, UsersDefinition as _build_stack_inputstream_v1beta1_UsersDefinition } from './build/stack/inputstream/v1beta1/Users';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  build: {
    stack: {
      inputstream: {
        v1beta1: {
          CreateInputRequest: MessageTypeDefinition
          CreateUserRequest: MessageTypeDefinition
          File: MessageTypeDefinition
          FileSet: MessageTypeDefinition
          GetInputRequest: MessageTypeDefinition
          GetUserRequest: MessageTypeDefinition
          Images: SubtypeConstructor<typeof grpc.Client, _build_stack_inputstream_v1beta1_ImagesClient> & { service: _build_stack_inputstream_v1beta1_ImagesDefinition }
          Input: MessageTypeDefinition
          InputContent: MessageTypeDefinition
          InputFilterOptions: MessageTypeDefinition
          Inputs: SubtypeConstructor<typeof grpc.Client, _build_stack_inputstream_v1beta1_InputsClient> & { service: _build_stack_inputstream_v1beta1_InputsDefinition }
          ListInputsRequest: MessageTypeDefinition
          ListInputsResponse: MessageTypeDefinition
          ListUsersRequest: MessageTypeDefinition
          ListUsersResponse: MessageTypeDefinition
          RemoveInputRequest: MessageTypeDefinition
          RemoveInputResponse: MessageTypeDefinition
          SearchImage: MessageTypeDefinition
          SearchImagesRequest: MessageTypeDefinition
          SearchImagesResponse: MessageTypeDefinition
          ShortPostInputContent: MessageTypeDefinition
          UnsplashImage: MessageTypeDefinition
          UnsplashUser: MessageTypeDefinition
          UpdateInputRequest: MessageTypeDefinition
          UpdateInputResponse: MessageTypeDefinition
          UpdateUserRequest: MessageTypeDefinition
          User: MessageTypeDefinition
          Users: SubtypeConstructor<typeof grpc.Client, _build_stack_inputstream_v1beta1_UsersClient> & { service: _build_stack_inputstream_v1beta1_UsersDefinition }
          WatchInputRequest: MessageTypeDefinition
        }
      }
    }
  }
  google: {
    protobuf: {
      Any: MessageTypeDefinition
      FieldMask: MessageTypeDefinition
      Timestamp: MessageTypeDefinition
    }
  }
}

