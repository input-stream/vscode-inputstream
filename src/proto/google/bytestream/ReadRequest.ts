// Original file: proto/bytestream.proto

import type { Long } from '@grpc/proto-loader';

/**
 * Request object for ByteStream.Read.
 */
export interface ReadRequest {
  /**
   * The name of the resource to read.
   */
  'resourceName'?: (string);
  /**
   * The offset for the first byte to return in the read, relative to the start
   * of the resource.
   * 
   * A `read_offset` that is negative or greater than the size of the resource
   * will cause an `OUT_OF_RANGE` error.
   */
  'readOffset'?: (number | string | Long);
  /**
   * The maximum number of `data` bytes the server is allowed to return in the
   * sum of all `ReadResponse` messages. A `read_limit` of zero indicates that
   * there is no limit, and a negative `read_limit` will cause an error.
   * 
   * If the stream returns fewer bytes than allowed by the `read_limit` and no
   * error occurred, the stream includes all data from the `read_offset` to the
   * end of the resource.
   */
  'readLimit'?: (number | string | Long);
}

/**
 * Request object for ByteStream.Read.
 */
export interface ReadRequest__Output {
  /**
   * The name of the resource to read.
   */
  'resourceName': (string);
  /**
   * The offset for the first byte to return in the read, relative to the start
   * of the resource.
   * 
   * A `read_offset` that is negative or greater than the size of the resource
   * will cause an `OUT_OF_RANGE` error.
   */
  'readOffset': (Long);
  /**
   * The maximum number of `data` bytes the server is allowed to return in the
   * sum of all `ReadResponse` messages. A `read_limit` of zero indicates that
   * there is no limit, and a negative `read_limit` will cause an error.
   * 
   * If the stream returns fewer bytes than allowed by the `read_limit` and no
   * error occurred, the stream includes all data from the `read_offset` to the
   * end of the resource.
   */
  'readLimit': (Long);
}
