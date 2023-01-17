// Original file: proto/bytestream.proto

import type { Long } from '@grpc/proto-loader';

/**
 * Response object for ByteStream.QueryWriteStatus.
 */
export interface QueryWriteStatusResponse {
  /**
   * The number of bytes that have been processed for the given resource.
   */
  'committedSize'?: (number | string | Long);
  /**
   * `complete` is `true` only if the client has sent a `WriteRequest` with
   * `finish_write` set to true, and the server has processed that request.
   */
  'complete'?: (boolean);
}

/**
 * Response object for ByteStream.QueryWriteStatus.
 */
export interface QueryWriteStatusResponse__Output {
  /**
   * The number of bytes that have been processed for the given resource.
   */
  'committedSize': (Long);
  /**
   * `complete` is `true` only if the client has sent a `WriteRequest` with
   * `finish_write` set to true, and the server has processed that request.
   */
  'complete': (boolean);
}
