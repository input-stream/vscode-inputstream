// Original file: proto/inputstream.proto

import type { InputContent as _build_stack_inputstream_v1beta1_InputContent, InputContent__Output as _build_stack_inputstream_v1beta1_InputContent__Output } from '../../../../build/stack/inputstream/v1beta1/InputContent';
import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../../../google/protobuf/Timestamp';
import type { User as _build_stack_inputstream_v1beta1_User, User__Output as _build_stack_inputstream_v1beta1_User__Output } from '../../../../build/stack/inputstream/v1beta1/User';
import type { Long } from '@grpc/proto-loader';

// Original file: proto/inputstream.proto

export enum _build_stack_inputstream_v1beta1_Input_Status {
  STATUS_UNKNOWN = 0,
  STATUS_DRAFT = 1,
  STATUS_PUBLISHED = 2,
}

// Original file: proto/inputstream.proto

export enum _build_stack_inputstream_v1beta1_Input_Type {
  TYPE_UNKNOWN = 0,
  TYPE_ANY = 1,
  TYPE_TWEET = 2,
  TYPE_SHORT_POST = 3,
  TYPE_LONG_POST = 4,
  TYPE_IMAGE = 5,
  TYPE_PRESENTATION = 6,
}

export interface Input {
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
   * the content value, if masked
   */
  'content'?: (_build_stack_inputstream_v1beta1_InputContent);
  /**
   * Date when post was created
   */
  'createdAt'?: (_google_protobuf_Timestamp);
  /**
   * Date when post content was last updated
   */
  'updatedAt'?: (_google_protobuf_Timestamp);
  /**
   * the type of input this is
   */
  'type'?: (_build_stack_inputstream_v1beta1_Input_Type | keyof typeof _build_stack_inputstream_v1beta1_Input_Type);
  /**
   * the post identifier (a simple number)
   */
  'pid'?: (number | string | Long);
  /**
   * The status of this input (published or not)
   */
  'status'?: (_build_stack_inputstream_v1beta1_Input_Status | keyof typeof _build_stack_inputstream_v1beta1_Input_Status);
  /**
   * The user that published this item.  This is only
   * populated after the item is published.
   */
  'user'?: (_build_stack_inputstream_v1beta1_User);
  /**
   * The subtitle of the post
   */
  'subtitle'?: (string);
  /**
   * Tags associated with the post
   */
  'tag'?: (string)[];
  /**
   * The title slug
   */
  'titleSlug'?: (string);
  /**
   * Date when post content was last published
   */
  'publishedAt'?: (_google_protobuf_Timestamp);
  /**
   * the URL where the input can be viewed
   */
  'htmlUrl'?: (string);
}

export interface Input__Output {
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
   * the content value, if masked
   */
  'content'?: (_build_stack_inputstream_v1beta1_InputContent__Output);
  /**
   * Date when post was created
   */
  'createdAt'?: (_google_protobuf_Timestamp__Output);
  /**
   * Date when post content was last updated
   */
  'updatedAt'?: (_google_protobuf_Timestamp__Output);
  /**
   * the type of input this is
   */
  'type': (_build_stack_inputstream_v1beta1_Input_Type);
  /**
   * the post identifier (a simple number)
   */
  'pid': (Long);
  /**
   * The status of this input (published or not)
   */
  'status': (_build_stack_inputstream_v1beta1_Input_Status);
  /**
   * The user that published this item.  This is only
   * populated after the item is published.
   */
  'user'?: (_build_stack_inputstream_v1beta1_User__Output);
  /**
   * The subtitle of the post
   */
  'subtitle': (string);
  /**
   * Tags associated with the post
   */
  'tag': (string)[];
  /**
   * The title slug
   */
  'titleSlug': (string);
  /**
   * Date when post content was last published
   */
  'publishedAt'?: (_google_protobuf_Timestamp__Output);
  /**
   * the URL where the input can be viewed
   */
  'htmlUrl': (string);
}
