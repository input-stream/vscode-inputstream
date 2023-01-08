// Original file: proto/bytestream.proto


/**
 * Response object for ByteStream.Read.
 */
export interface ReadResponse {
  /**
   * A portion of the data for the resource. The service **may** leave `data`
   * empty for any given `ReadResponse`. This enables the service to inform the
   * client that the request is still live while it is running an operation to
   * generate more data.
   */
  'data'?: (Buffer | Uint8Array | string);
}

/**
 * Response object for ByteStream.Read.
 */
export interface ReadResponse__Output {
  /**
   * A portion of the data for the resource. The service **may** leave `data`
   * empty for any given `ReadResponse`. This enables the service to inform the
   * client that the request is still live while it is running an operation to
   * generate more data.
   */
  'data': (Buffer);
}
