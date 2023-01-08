// Original file: proto/bytestream.proto

import type { Long } from '@grpc/proto-loader';

/**
 * Response object for ByteStream.Write.
 */
export interface WriteResponse {
  /**
   * The number of bytes that have been processed for the given resource.
   */
  'committedSize'?: (number | string | Long);
}

/**
 * Response object for ByteStream.Write.
 */
export interface WriteResponse__Output {
  /**
   * The number of bytes that have been processed for the given resource.
   */
  'committedSize': (Long);
}
