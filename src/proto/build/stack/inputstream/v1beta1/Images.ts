// Original file: proto/inputstream.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { SearchImagesRequest as _build_stack_inputstream_v1beta1_SearchImagesRequest, SearchImagesRequest__Output as _build_stack_inputstream_v1beta1_SearchImagesRequest__Output } from '../../../../build/stack/inputstream/v1beta1/SearchImagesRequest';
import type { SearchImagesResponse as _build_stack_inputstream_v1beta1_SearchImagesResponse, SearchImagesResponse__Output as _build_stack_inputstream_v1beta1_SearchImagesResponse__Output } from '../../../../build/stack/inputstream/v1beta1/SearchImagesResponse';

export interface ImagesClient extends grpc.Client {
  SearchImages(argument: _build_stack_inputstream_v1beta1_SearchImagesRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_SearchImagesResponse__Output>): grpc.ClientUnaryCall;
  SearchImages(argument: _build_stack_inputstream_v1beta1_SearchImagesRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_SearchImagesResponse__Output>): grpc.ClientUnaryCall;
  SearchImages(argument: _build_stack_inputstream_v1beta1_SearchImagesRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_SearchImagesResponse__Output>): grpc.ClientUnaryCall;
  SearchImages(argument: _build_stack_inputstream_v1beta1_SearchImagesRequest, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_SearchImagesResponse__Output>): grpc.ClientUnaryCall;
  searchImages(argument: _build_stack_inputstream_v1beta1_SearchImagesRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_SearchImagesResponse__Output>): grpc.ClientUnaryCall;
  searchImages(argument: _build_stack_inputstream_v1beta1_SearchImagesRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_SearchImagesResponse__Output>): grpc.ClientUnaryCall;
  searchImages(argument: _build_stack_inputstream_v1beta1_SearchImagesRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_SearchImagesResponse__Output>): grpc.ClientUnaryCall;
  searchImages(argument: _build_stack_inputstream_v1beta1_SearchImagesRequest, callback: grpc.requestCallback<_build_stack_inputstream_v1beta1_SearchImagesResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface ImagesHandlers extends grpc.UntypedServiceImplementation {
  SearchImages: grpc.handleUnaryCall<_build_stack_inputstream_v1beta1_SearchImagesRequest__Output, _build_stack_inputstream_v1beta1_SearchImagesResponse>;
  
}

export interface ImagesDefinition extends grpc.ServiceDefinition {
  SearchImages: MethodDefinition<_build_stack_inputstream_v1beta1_SearchImagesRequest, _build_stack_inputstream_v1beta1_SearchImagesResponse, _build_stack_inputstream_v1beta1_SearchImagesRequest__Output, _build_stack_inputstream_v1beta1_SearchImagesResponse__Output>
}
