import type * as grpc from '@grpc/grpc-js';
import type { ServiceDefinition, EnumTypeDefinition, MessageTypeDefinition } from '@grpc/proto-loader';

import type { PostsClient as _build_stack_printstream_v1beta1_PostsClient } from './build/stack/printstream/v1beta1/Posts';
import type { UsersClient as _build_stack_printstream_v1beta1_UsersClient } from './build/stack/printstream/v1beta1/Users';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  build: {
    stack: {
      printstream: {
        v1beta1: {
          CreatePostRequest: MessageTypeDefinition
          CreateUserRequest: MessageTypeDefinition
          GetPostContentRequest: MessageTypeDefinition
          GetPostContentResponse: MessageTypeDefinition
          GetPostRequest: MessageTypeDefinition
          GetUserRequest: MessageTypeDefinition
          ListPostsRequest: MessageTypeDefinition
          ListPostsResponse: MessageTypeDefinition
          ListUsersRequest: MessageTypeDefinition
          ListUsersResponse: MessageTypeDefinition
          Post: MessageTypeDefinition
          Posts: SubtypeConstructor<typeof grpc.Client, _build_stack_printstream_v1beta1_PostsClient> & { service: ServiceDefinition }
          RemovePostRequest: MessageTypeDefinition
          RemovePostResponse: MessageTypeDefinition
          User: MessageTypeDefinition
          Users: SubtypeConstructor<typeof grpc.Client, _build_stack_printstream_v1beta1_UsersClient> & { service: ServiceDefinition }
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

