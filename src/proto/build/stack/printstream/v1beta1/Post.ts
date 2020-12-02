// Original file: proto/printstream.proto

import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../../../google/protobuf/Timestamp';
import type { Long } from '@grpc/proto-loader';

// Original file: proto/printstream.proto

export enum _build_stack_printstream_v1beta1_Post_Type {
  TYPE_UNKNOWN = 0,
  TYPE_MARKDOWN = 1,
}

export interface Post {
  /**
   * the owner of the post
   */
  'login'?: (string);
  /**
   * a uuid for this post
   */
  'id'?: (string);
  /**
   * title of the post
   */
  'title'?: (string);
  /**
   * a summary of the post
   */
  'abstract'?: (string);
  /**
   * a URL for a representative image
   */
  'imageUrl'?: (string);
  /**
   * content of the post.  Typically not populated unless content is
   * requested.
   */
  'content'?: (Buffer | Uint8Array | string);
  /**
   * Date when post was created
   */
  'createdAt'?: (_google_protobuf_Timestamp);
  /**
   * Date when post content was last modified
   */
  'modifiedAt'?: (_google_protobuf_Timestamp);
  /**
   * the type of post this is
   */
  'type'?: (_build_stack_printstream_v1beta1_Post_Type | keyof typeof _build_stack_printstream_v1beta1_Post_Type);
  /**
   * the post identifier (a simple number)
   */
  'pid'?: (number | string | Long);
}

export interface Post__Output {
  /**
   * the owner of the post
   */
  'login': (string);
  /**
   * a uuid for this post
   */
  'id': (string);
  /**
   * title of the post
   */
  'title': (string);
  /**
   * a summary of the post
   */
  'abstract': (string);
  /**
   * a URL for a representative image
   */
  'imageUrl': (string);
  /**
   * content of the post.  Typically not populated unless content is
   * requested.
   */
  'content': (Buffer);
  /**
   * Date when post was created
   */
  'createdAt'?: (_google_protobuf_Timestamp__Output);
  /**
   * Date when post content was last modified
   */
  'modifiedAt'?: (_google_protobuf_Timestamp__Output);
  /**
   * the type of post this is
   */
  'type': (_build_stack_printstream_v1beta1_Post_Type);
  /**
   * the post identifier (a simple number)
   */
  'pid': (Long);
}
