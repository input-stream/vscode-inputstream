// Original file: proto/bytestream.proto

import type * as grpc from '@grpc/grpc-js'
import type { QueryWriteStatusRequest as _google_bytestream_QueryWriteStatusRequest, QueryWriteStatusRequest__Output as _google_bytestream_QueryWriteStatusRequest__Output } from '../../google/bytestream/QueryWriteStatusRequest';
import type { QueryWriteStatusResponse as _google_bytestream_QueryWriteStatusResponse, QueryWriteStatusResponse__Output as _google_bytestream_QueryWriteStatusResponse__Output } from '../../google/bytestream/QueryWriteStatusResponse';
import type { ReadRequest as _google_bytestream_ReadRequest, ReadRequest__Output as _google_bytestream_ReadRequest__Output } from '../../google/bytestream/ReadRequest';
import type { ReadResponse as _google_bytestream_ReadResponse, ReadResponse__Output as _google_bytestream_ReadResponse__Output } from '../../google/bytestream/ReadResponse';
import type { WriteRequest as _google_bytestream_WriteRequest, WriteRequest__Output as _google_bytestream_WriteRequest__Output } from '../../google/bytestream/WriteRequest';
import type { WriteResponse as _google_bytestream_WriteResponse, WriteResponse__Output as _google_bytestream_WriteResponse__Output } from '../../google/bytestream/WriteResponse';

/**
 * #### Introduction
 * 
 * The Byte Stream API enables a client to read and write a stream of bytes to
 * and from a resource. Resources have names, and these names are supplied in
 * the API calls below to identify the resource that is being read from or
 * written to.
 * 
 * All implementations of the Byte Stream API export the interface defined here:
 * 
 * * `Read()`: Reads the contents of a resource.
 * 
 * * `Write()`: Writes the contents of a resource. The client can call `Write()`
 * multiple times with the same resource and can check the status of the write
 * by calling `QueryWriteStatus()`.
 * 
 * #### Service parameters and metadata
 * 
 * The ByteStream API provides no direct way to access/modify any metadata
 * associated with the resource.
 * 
 * #### Errors
 * 
 * The errors returned by the service are in the Google canonical error space.
 */
export interface ByteStreamClient extends grpc.Client {
  /**
   * `QueryWriteStatus()` is used to find the `committed_size` for a resource
   * that is being written, which can then be used as the `write_offset` for
   * the next `Write()` call.
   * 
   * If the resource does not exist (i.e., the resource has been deleted, or the
   * first `Write()` has not yet reached the service), this method returns the
   * error `NOT_FOUND`.
   * 
   * The client **may** call `QueryWriteStatus()` at any time to determine how
   * much data has been processed for this resource. This is useful if the
   * client is buffering data and needs to know which data can be safely
   * evicted. For any sequence of `QueryWriteStatus()` calls for a given
   * resource name, the sequence of returned `committed_size` values will be
   * non-decreasing.
   */
  QueryWriteStatus(argument: _google_bytestream_QueryWriteStatusRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _google_bytestream_QueryWriteStatusResponse__Output) => void): grpc.ClientUnaryCall;
  QueryWriteStatus(argument: _google_bytestream_QueryWriteStatusRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _google_bytestream_QueryWriteStatusResponse__Output) => void): grpc.ClientUnaryCall;
  QueryWriteStatus(argument: _google_bytestream_QueryWriteStatusRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _google_bytestream_QueryWriteStatusResponse__Output) => void): grpc.ClientUnaryCall;
  QueryWriteStatus(argument: _google_bytestream_QueryWriteStatusRequest, callback: (error?: grpc.ServiceError, result?: _google_bytestream_QueryWriteStatusResponse__Output) => void): grpc.ClientUnaryCall;
  /**
   * `QueryWriteStatus()` is used to find the `committed_size` for a resource
   * that is being written, which can then be used as the `write_offset` for
   * the next `Write()` call.
   * 
   * If the resource does not exist (i.e., the resource has been deleted, or the
   * first `Write()` has not yet reached the service), this method returns the
   * error `NOT_FOUND`.
   * 
   * The client **may** call `QueryWriteStatus()` at any time to determine how
   * much data has been processed for this resource. This is useful if the
   * client is buffering data and needs to know which data can be safely
   * evicted. For any sequence of `QueryWriteStatus()` calls for a given
   * resource name, the sequence of returned `committed_size` values will be
   * non-decreasing.
   */
  queryWriteStatus(argument: _google_bytestream_QueryWriteStatusRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _google_bytestream_QueryWriteStatusResponse__Output) => void): grpc.ClientUnaryCall;
  queryWriteStatus(argument: _google_bytestream_QueryWriteStatusRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _google_bytestream_QueryWriteStatusResponse__Output) => void): grpc.ClientUnaryCall;
  queryWriteStatus(argument: _google_bytestream_QueryWriteStatusRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _google_bytestream_QueryWriteStatusResponse__Output) => void): grpc.ClientUnaryCall;
  queryWriteStatus(argument: _google_bytestream_QueryWriteStatusRequest, callback: (error?: grpc.ServiceError, result?: _google_bytestream_QueryWriteStatusResponse__Output) => void): grpc.ClientUnaryCall;

  /**
   * `Read()` is used to retrieve the contents of a resource as a sequence
   * of bytes. The bytes are returned in a sequence of responses, and the
   * responses are delivered as the results of a server-side streaming RPC.
   */
  Read(argument: _google_bytestream_ReadRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_google_bytestream_ReadResponse__Output>;
  Read(argument: _google_bytestream_ReadRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_google_bytestream_ReadResponse__Output>;
  /**
   * `Read()` is used to retrieve the contents of a resource as a sequence
   * of bytes. The bytes are returned in a sequence of responses, and the
   * responses are delivered as the results of a server-side streaming RPC.
   */
  read(argument: _google_bytestream_ReadRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_google_bytestream_ReadResponse__Output>;
  read(argument: _google_bytestream_ReadRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_google_bytestream_ReadResponse__Output>;

  /**
   * `Write()` is used to send the contents of a resource as a sequence of
   * bytes. The bytes are sent in a sequence of request protos of a client-side
   * streaming RPC.
   * 
   * A `Write()` action is resumable. If there is an error or the connection is
   * broken during the `Write()`, the client should check the status of the
   * `Write()` by calling `QueryWriteStatus()` and continue writing from the
   * returned `committed_size`. This may be less than the amount of data the
   * client previously sent.
   * 
   * Calling `Write()` on a resource name that was previously written and
   * finalized could cause an error, depending on whether the underlying service
   * allows over-writing of previously written resources.
   * 
   * When the client closes the request channel, the service will respond with
   * a `WriteResponse`. The service will not view the resource as `complete`
   * until the client has sent a `WriteRequest` with `finish_write` set to
   * `true`. Sending any requests on a stream after sending a request with
   * `finish_write` set to `true` will cause an error. The client **should**
   * check the `WriteResponse` it receives to determine how much data the
   * service was able to commit and whether the service views the resource as
   * `complete` or not.
   */
  Write(metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _google_bytestream_WriteResponse__Output) => void): grpc.ClientWritableStream<_google_bytestream_WriteRequest>;
  Write(metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _google_bytestream_WriteResponse__Output) => void): grpc.ClientWritableStream<_google_bytestream_WriteRequest>;
  Write(options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _google_bytestream_WriteResponse__Output) => void): grpc.ClientWritableStream<_google_bytestream_WriteRequest>;
  Write(callback: (error?: grpc.ServiceError, result?: _google_bytestream_WriteResponse__Output) => void): grpc.ClientWritableStream<_google_bytestream_WriteRequest>;
  /**
   * `Write()` is used to send the contents of a resource as a sequence of
   * bytes. The bytes are sent in a sequence of request protos of a client-side
   * streaming RPC.
   * 
   * A `Write()` action is resumable. If there is an error or the connection is
   * broken during the `Write()`, the client should check the status of the
   * `Write()` by calling `QueryWriteStatus()` and continue writing from the
   * returned `committed_size`. This may be less than the amount of data the
   * client previously sent.
   * 
   * Calling `Write()` on a resource name that was previously written and
   * finalized could cause an error, depending on whether the underlying service
   * allows over-writing of previously written resources.
   * 
   * When the client closes the request channel, the service will respond with
   * a `WriteResponse`. The service will not view the resource as `complete`
   * until the client has sent a `WriteRequest` with `finish_write` set to
   * `true`. Sending any requests on a stream after sending a request with
   * `finish_write` set to `true` will cause an error. The client **should**
   * check the `WriteResponse` it receives to determine how much data the
   * service was able to commit and whether the service views the resource as
   * `complete` or not.
   */
  write(metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _google_bytestream_WriteResponse__Output) => void): grpc.ClientWritableStream<_google_bytestream_WriteRequest>;
  write(metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _google_bytestream_WriteResponse__Output) => void): grpc.ClientWritableStream<_google_bytestream_WriteRequest>;
  write(options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _google_bytestream_WriteResponse__Output) => void): grpc.ClientWritableStream<_google_bytestream_WriteRequest>;
  write(callback: (error?: grpc.ServiceError, result?: _google_bytestream_WriteResponse__Output) => void): grpc.ClientWritableStream<_google_bytestream_WriteRequest>;

}

/**
 * #### Introduction
 * 
 * The Byte Stream API enables a client to read and write a stream of bytes to
 * and from a resource. Resources have names, and these names are supplied in
 * the API calls below to identify the resource that is being read from or
 * written to.
 * 
 * All implementations of the Byte Stream API export the interface defined here:
 * 
 * * `Read()`: Reads the contents of a resource.
 * 
 * * `Write()`: Writes the contents of a resource. The client can call `Write()`
 * multiple times with the same resource and can check the status of the write
 * by calling `QueryWriteStatus()`.
 * 
 * #### Service parameters and metadata
 * 
 * The ByteStream API provides no direct way to access/modify any metadata
 * associated with the resource.
 * 
 * #### Errors
 * 
 * The errors returned by the service are in the Google canonical error space.
 */
export interface ByteStreamHandlers extends grpc.UntypedServiceImplementation {
  /**
   * `QueryWriteStatus()` is used to find the `committed_size` for a resource
   * that is being written, which can then be used as the `write_offset` for
   * the next `Write()` call.
   * 
   * If the resource does not exist (i.e., the resource has been deleted, or the
   * first `Write()` has not yet reached the service), this method returns the
   * error `NOT_FOUND`.
   * 
   * The client **may** call `QueryWriteStatus()` at any time to determine how
   * much data has been processed for this resource. This is useful if the
   * client is buffering data and needs to know which data can be safely
   * evicted. For any sequence of `QueryWriteStatus()` calls for a given
   * resource name, the sequence of returned `committed_size` values will be
   * non-decreasing.
   */
  QueryWriteStatus: grpc.handleUnaryCall<_google_bytestream_QueryWriteStatusRequest__Output, _google_bytestream_QueryWriteStatusResponse>;

  /**
   * `Read()` is used to retrieve the contents of a resource as a sequence
   * of bytes. The bytes are returned in a sequence of responses, and the
   * responses are delivered as the results of a server-side streaming RPC.
   */
  Read: grpc.handleServerStreamingCall<_google_bytestream_ReadRequest__Output, _google_bytestream_ReadResponse>;

  /**
   * `Write()` is used to send the contents of a resource as a sequence of
   * bytes. The bytes are sent in a sequence of request protos of a client-side
   * streaming RPC.
   * 
   * A `Write()` action is resumable. If there is an error or the connection is
   * broken during the `Write()`, the client should check the status of the
   * `Write()` by calling `QueryWriteStatus()` and continue writing from the
   * returned `committed_size`. This may be less than the amount of data the
   * client previously sent.
   * 
   * Calling `Write()` on a resource name that was previously written and
   * finalized could cause an error, depending on whether the underlying service
   * allows over-writing of previously written resources.
   * 
   * When the client closes the request channel, the service will respond with
   * a `WriteResponse`. The service will not view the resource as `complete`
   * until the client has sent a `WriteRequest` with `finish_write` set to
   * `true`. Sending any requests on a stream after sending a request with
   * `finish_write` set to `true` will cause an error. The client **should**
   * check the `WriteResponse` it receives to determine how much data the
   * service was able to commit and whether the service views the resource as
   * `complete` or not.
   */
  Write: grpc.handleClientStreamingCall<_google_bytestream_WriteRequest__Output, _google_bytestream_WriteResponse>;

}
