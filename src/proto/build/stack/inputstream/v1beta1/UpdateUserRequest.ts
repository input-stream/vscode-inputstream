// Original file: proto/inputstream.proto

import type { User as _build_stack_inputstream_v1beta1_User, User__Output as _build_stack_inputstream_v1beta1_User__Output } from '../../../../build/stack/inputstream/v1beta1/User';
import type { FieldMask as _google_protobuf_FieldMask, FieldMask__Output as _google_protobuf_FieldMask__Output } from '../../../../google/protobuf/FieldMask';

export interface UpdateUserRequest {
  'user'?: (_build_stack_inputstream_v1beta1_User | null);
  'mask'?: (_google_protobuf_FieldMask | null);
}

export interface UpdateUserRequest__Output {
  'user': (_build_stack_inputstream_v1beta1_User__Output | null);
  'mask': (_google_protobuf_FieldMask__Output | null);
}
