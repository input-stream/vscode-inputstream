// Original file: proto/inputstream.proto

import type { FieldMask as _google_protobuf_FieldMask, FieldMask__Output as _google_protobuf_FieldMask__Output } from '../../../../google/protobuf/FieldMask';

export interface WatchInputRequest {
  'owner'?: (string);
  'id'?: (string);
  'mask'?: (_google_protobuf_FieldMask | null);
  /**
   * The login token, in the event that the streaming endpoint does not
   * support headers.
   */
  'bearerToken'?: (string);
}

export interface WatchInputRequest__Output {
  'owner': (string);
  'id': (string);
  'mask': (_google_protobuf_FieldMask__Output | null);
  /**
   * The login token, in the event that the streaming endpoint does not
   * support headers.
   */
  'bearerToken': (string);
}
