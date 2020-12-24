// Original file: proto/inputstream.proto

import type { FieldMask as _google_protobuf_FieldMask, FieldMask__Output as _google_protobuf_FieldMask__Output } from '../../../../google/protobuf/FieldMask';

export interface GetInputRequest {
  'login'?: (string);
  'id'?: (string);
  'mask'?: (_google_protobuf_FieldMask);
}

export interface GetInputRequest__Output {
  'login': (string);
  'id': (string);
  'mask'?: (_google_protobuf_FieldMask__Output);
}
