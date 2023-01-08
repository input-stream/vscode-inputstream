// Original file: proto/bytestream.proto

import type { Long } from '@grpc/proto-loader';

/**
 * Request object for ByteStream.Write.
 */
export interface WriteRequest {
  /**
   * The name of the resource to write. This **must** be set on the first
   * `WriteRequest` of each `Write()` action. If it is set on subsequent calls,
   * it **must** match the value of the first request.
   */
  'resourceName'?: (string);
  /**
   * The offset from the beginning of the resource at which the data should be
   * written. It is required on all `WriteRequest`s.
   * 
   * In the first `WriteRequest` of a `Write()` action, it indicates
   * the initial offset for the `Write()` call. The value **must** be equal to
   * the `committed_size` that a call to `QueryWriteStatus()` would return.
   * 
   * On subsequent calls, this value **must** be set and **must** be equal to
   * the sum of the first `write_offset` and the sizes of all `data` bundles
   * sent previously on this stream.
   * 
   * An incorrect value will cause an error.
   */
  'writeOffset'?: (number | string | Long);
  /**
   * If `true`, this indicates that the write is complete. Sending any
   * `WriteRequest`s subsequent to one in which `finish_write` is `true` will
   * cause an error.
   */
  'finishWrite'?: (boolean);
  /**
   * A portion of the data for the resource. The client **may** leave `data`
   * empty for any given `WriteRequest`. This enables the client to inform the
   * service that the request is still live while it is running an operation to
   * generate more data.
   */
  'data'?: (Buffer | Uint8Array | string);
}

/**
 * Request object for ByteStream.Write.
 */
export interface WriteRequest__Output {
  /**
   * The name of the resource to write. This **must** be set on the first
   * `WriteRequest` of each `Write()` action. If it is set on subsequent calls,
   * it **must** match the value of the first request.
   */
  'resourceName': (string);
  /**
   * The offset from the beginning of the resource at which the data should be
   * written. It is required on all `WriteRequest`s.
   * 
   * In the first `WriteRequest` of a `Write()` action, it indicates
   * the initial offset for the `Write()` call. The value **must** be equal to
   * the `committed_size` that a call to `QueryWriteStatus()` would return.
   * 
   * On subsequent calls, this value **must** be set and **must** be equal to
   * the sum of the first `write_offset` and the sizes of all `data` bundles
   * sent previously on this stream.
   * 
   * An incorrect value will cause an error.
   */
  'writeOffset': (Long);
  /**
   * If `true`, this indicates that the write is complete. Sending any
   * `WriteRequest`s subsequent to one in which `finish_write` is `true` will
   * cause an error.
   */
  'finishWrite': (boolean);
  /**
   * A portion of the data for the resource. The client **may** leave `data`
   * empty for any given `WriteRequest`. This enables the client to inform the
   * service that the request is still live while it is running an operation to
   * generate more data.
   */
  'data': (Buffer);
}
