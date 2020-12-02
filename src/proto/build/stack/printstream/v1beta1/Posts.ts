// Original file: proto/printstream.proto

import type * as grpc from '@grpc/grpc-js'
import type { CreatePostRequest as _build_stack_printstream_v1beta1_CreatePostRequest, CreatePostRequest__Output as _build_stack_printstream_v1beta1_CreatePostRequest__Output } from '../../../../build/stack/printstream/v1beta1/CreatePostRequest';
import type { GetPostContentRequest as _build_stack_printstream_v1beta1_GetPostContentRequest, GetPostContentRequest__Output as _build_stack_printstream_v1beta1_GetPostContentRequest__Output } from '../../../../build/stack/printstream/v1beta1/GetPostContentRequest';
import type { GetPostContentResponse as _build_stack_printstream_v1beta1_GetPostContentResponse, GetPostContentResponse__Output as _build_stack_printstream_v1beta1_GetPostContentResponse__Output } from '../../../../build/stack/printstream/v1beta1/GetPostContentResponse';
import type { GetPostRequest as _build_stack_printstream_v1beta1_GetPostRequest, GetPostRequest__Output as _build_stack_printstream_v1beta1_GetPostRequest__Output } from '../../../../build/stack/printstream/v1beta1/GetPostRequest';
import type { ListPostsRequest as _build_stack_printstream_v1beta1_ListPostsRequest, ListPostsRequest__Output as _build_stack_printstream_v1beta1_ListPostsRequest__Output } from '../../../../build/stack/printstream/v1beta1/ListPostsRequest';
import type { ListPostsResponse as _build_stack_printstream_v1beta1_ListPostsResponse, ListPostsResponse__Output as _build_stack_printstream_v1beta1_ListPostsResponse__Output } from '../../../../build/stack/printstream/v1beta1/ListPostsResponse';
import type { Post as _build_stack_printstream_v1beta1_Post, Post__Output as _build_stack_printstream_v1beta1_Post__Output } from '../../../../build/stack/printstream/v1beta1/Post';

export interface PostsClient extends grpc.Client {
  CreatePost(argument: _build_stack_printstream_v1beta1_CreatePostRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  CreatePost(argument: _build_stack_printstream_v1beta1_CreatePostRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  CreatePost(argument: _build_stack_printstream_v1beta1_CreatePostRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  CreatePost(argument: _build_stack_printstream_v1beta1_CreatePostRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  createPost(argument: _build_stack_printstream_v1beta1_CreatePostRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  createPost(argument: _build_stack_printstream_v1beta1_CreatePostRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  createPost(argument: _build_stack_printstream_v1beta1_CreatePostRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  createPost(argument: _build_stack_printstream_v1beta1_CreatePostRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  
  GetPost(argument: _build_stack_printstream_v1beta1_GetPostRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  GetPost(argument: _build_stack_printstream_v1beta1_GetPostRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  GetPost(argument: _build_stack_printstream_v1beta1_GetPostRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  GetPost(argument: _build_stack_printstream_v1beta1_GetPostRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  getPost(argument: _build_stack_printstream_v1beta1_GetPostRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  getPost(argument: _build_stack_printstream_v1beta1_GetPostRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  getPost(argument: _build_stack_printstream_v1beta1_GetPostRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  getPost(argument: _build_stack_printstream_v1beta1_GetPostRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_Post__Output) => void): grpc.ClientUnaryCall;
  
  GetPostContent(argument: _build_stack_printstream_v1beta1_GetPostContentRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_GetPostContentResponse__Output) => void): grpc.ClientUnaryCall;
  GetPostContent(argument: _build_stack_printstream_v1beta1_GetPostContentRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_GetPostContentResponse__Output) => void): grpc.ClientUnaryCall;
  GetPostContent(argument: _build_stack_printstream_v1beta1_GetPostContentRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_GetPostContentResponse__Output) => void): grpc.ClientUnaryCall;
  GetPostContent(argument: _build_stack_printstream_v1beta1_GetPostContentRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_GetPostContentResponse__Output) => void): grpc.ClientUnaryCall;
  getPostContent(argument: _build_stack_printstream_v1beta1_GetPostContentRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_GetPostContentResponse__Output) => void): grpc.ClientUnaryCall;
  getPostContent(argument: _build_stack_printstream_v1beta1_GetPostContentRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_GetPostContentResponse__Output) => void): grpc.ClientUnaryCall;
  getPostContent(argument: _build_stack_printstream_v1beta1_GetPostContentRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_GetPostContentResponse__Output) => void): grpc.ClientUnaryCall;
  getPostContent(argument: _build_stack_printstream_v1beta1_GetPostContentRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_GetPostContentResponse__Output) => void): grpc.ClientUnaryCall;
  
  ListPosts(argument: _build_stack_printstream_v1beta1_ListPostsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_ListPostsResponse__Output) => void): grpc.ClientUnaryCall;
  ListPosts(argument: _build_stack_printstream_v1beta1_ListPostsRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_ListPostsResponse__Output) => void): grpc.ClientUnaryCall;
  ListPosts(argument: _build_stack_printstream_v1beta1_ListPostsRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_ListPostsResponse__Output) => void): grpc.ClientUnaryCall;
  ListPosts(argument: _build_stack_printstream_v1beta1_ListPostsRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_ListPostsResponse__Output) => void): grpc.ClientUnaryCall;
  listPosts(argument: _build_stack_printstream_v1beta1_ListPostsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_ListPostsResponse__Output) => void): grpc.ClientUnaryCall;
  listPosts(argument: _build_stack_printstream_v1beta1_ListPostsRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_ListPostsResponse__Output) => void): grpc.ClientUnaryCall;
  listPosts(argument: _build_stack_printstream_v1beta1_ListPostsRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_ListPostsResponse__Output) => void): grpc.ClientUnaryCall;
  listPosts(argument: _build_stack_printstream_v1beta1_ListPostsRequest, callback: (error?: grpc.ServiceError, result?: _build_stack_printstream_v1beta1_ListPostsResponse__Output) => void): grpc.ClientUnaryCall;
  
}

export interface PostsHandlers extends grpc.UntypedServiceImplementation {
  CreatePost: grpc.handleUnaryCall<_build_stack_printstream_v1beta1_CreatePostRequest__Output, _build_stack_printstream_v1beta1_Post>;
  
  GetPost: grpc.handleUnaryCall<_build_stack_printstream_v1beta1_GetPostRequest__Output, _build_stack_printstream_v1beta1_Post>;
  
  GetPostContent: grpc.handleUnaryCall<_build_stack_printstream_v1beta1_GetPostContentRequest__Output, _build_stack_printstream_v1beta1_GetPostContentResponse>;
  
  ListPosts: grpc.handleUnaryCall<_build_stack_printstream_v1beta1_ListPostsRequest__Output, _build_stack_printstream_v1beta1_ListPostsResponse>;
  
}
