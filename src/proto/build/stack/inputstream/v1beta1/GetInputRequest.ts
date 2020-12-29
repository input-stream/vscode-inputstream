// Original file: proto/inputstream.proto

import type { FieldMask as _google_protobuf_FieldMask, FieldMask__Output as _google_protobuf_FieldMask__Output } from '../../../../google/protobuf/FieldMask';

export interface GetInputRequest {
  'login'?: (string);
  /**
   * select using the input id
   */
  'id'?: (string);
  /**
   * alternatively, get the input having the given title slug
   */
  'titleSlug'?: (string);
  /**
   * optional mask for specifying a subset of fields
   */
  'mask'?: (_google_protobuf_FieldMask);
}

export interface GetInputRequest__Output {
  'login': (string);
  /**
   * select using the input id
   */
  'id': (string);
  /**
   * alternatively, get the input having the given title slug
   */
  'titleSlug': (string);
  /**
   * optional mask for specifying a subset of fields
   */
  'mask'?: (_google_protobuf_FieldMask__Output);
}
