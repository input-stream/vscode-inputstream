// Original file: proto/inputstream.proto

import type { Input as _build_stack_inputstream_v1beta1_Input, Input__Output as _build_stack_inputstream_v1beta1_Input__Output } from '../../../../build/stack/inputstream/v1beta1/Input';
import type { FieldMask as _google_protobuf_FieldMask, FieldMask__Output as _google_protobuf_FieldMask__Output } from '../../../../google/protobuf/FieldMask';

export interface UpdateInputRequest {
  'input'?: (_build_stack_inputstream_v1beta1_Input | null);
  'mask'?: (_google_protobuf_FieldMask | null);
}

export interface UpdateInputRequest__Output {
  'input': (_build_stack_inputstream_v1beta1_Input__Output | null);
  'mask': (_google_protobuf_FieldMask__Output | null);
}
