import type * as grpc from '@grpc/grpc-js';
import type { ServiceDefinition, EnumTypeDefinition, MessageTypeDefinition } from '@grpc/proto-loader';

import type { InputsClient as _build_stack_inputstream_v1beta1_InputsClient } from './build/stack/inputstream/v1beta1/Inputs';
import type { UsersClient as _build_stack_inputstream_v1beta1_UsersClient } from './build/stack/inputstream/v1beta1/Users';

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
          GetInputContentRequest: MessageTypeDefinition
          GetInputContentResponse: MessageTypeDefinition
          GetInputRequest: MessageTypeDefinition
          GetUserRequest: MessageTypeDefinition
          Input: MessageTypeDefinition
          Inputs: SubtypeConstructor<typeof grpc.Client, _build_stack_inputstream_v1beta1_InputsClient> & { service: ServiceDefinition }
          ListInputsRequest: MessageTypeDefinition
          ListInputsResponse: MessageTypeDefinition
          ListUsersRequest: MessageTypeDefinition
          ListUsersResponse: MessageTypeDefinition
          RemoveInputRequest: MessageTypeDefinition
          RemoveInputResponse: MessageTypeDefinition
          User: MessageTypeDefinition
          Users: SubtypeConstructor<typeof grpc.Client, _build_stack_inputstream_v1beta1_UsersClient> & { service: ServiceDefinition }
        }
      }
    }
  }
  google: {
    protobuf: {
      Timestamp: MessageTypeDefinition
    }
  }
}

