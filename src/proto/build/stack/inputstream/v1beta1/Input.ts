// Original file: proto/inputstream.proto

import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../../../google/protobuf/Timestamp';
import type { Long } from '@grpc/proto-loader';

// Original file: proto/inputstream.proto

export enum _build_stack_inputstream_v1beta1_Input_Type {
  TYPE_UNKNOWN = 0,
  TYPE_MARKDOWN = 1,
}

export interface Input {
  /**
   * the owner of the Input
   */
  'login'?: (string);
  /**
   * a uuid for this Input
   */
  'id'?: (string);
  /**
   * title of the Input
   */
  'title'?: (string);
  /**
   * a summary of the Input
   */
  'abstract'?: (string);
  /**
   * a URL for a representative image
   */
  'imageUrl'?: (string);
  /**
   * content of the Input.  Typically not populated unless content is
   * requested.
   */
  'content'?: (Buffer | Uint8Array | string);
  /**
   * Date when Input was created
   */
  'createdAt'?: (_google_protobuf_Timestamp);
  /**
   * Date when Input content was last modified
   */
  'modifiedAt'?: (_google_protobuf_Timestamp);
  /**
   * the type of Input this is
   */
  'type'?: (_build_stack_inputstream_v1beta1_Input_Type | keyof typeof _build_stack_inputstream_v1beta1_Input_Type);
  /**
   * the Input identifier (a simple number)
   */
  'pid'?: (number | string | Long);
}

export interface Input__Output {
  /**
   * the owner of the Input
   */
  'login': (string);
  /**
   * a uuid for this Input
   */
  'id': (string);
  /**
   * title of the Input
   */
  'title': (string);
  /**
   * a summary of the Input
   */
  'abstract': (string);
  /**
   * a URL for a representative image
   */
  'imageUrl': (string);
  /**
   * content of the Input.  Typically not populated unless content is
   * requested.
   */
  'content': (Buffer);
  /**
   * Date when Input was created
   */
  'createdAt'?: (_google_protobuf_Timestamp__Output);
  /**
   * Date when Input content was last modified
   */
  'modifiedAt'?: (_google_protobuf_Timestamp__Output);
  /**
   * the type of Input this is
   */
  'type': (_build_stack_inputstream_v1beta1_Input_Type);
  /**
   * the Input identifier (a simple number)
   */
  'pid': (Long);
}
