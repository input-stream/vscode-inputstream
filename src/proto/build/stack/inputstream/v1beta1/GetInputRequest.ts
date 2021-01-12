// Original file: proto/inputstream.proto

import type { InputFilterOptions as _build_stack_inputstream_v1beta1_InputFilterOptions, InputFilterOptions__Output as _build_stack_inputstream_v1beta1_InputFilterOptions__Output } from '../../../../build/stack/inputstream/v1beta1/InputFilterOptions';
import type { FieldMask as _google_protobuf_FieldMask, FieldMask__Output as _google_protobuf_FieldMask__Output } from '../../../../google/protobuf/FieldMask';

export interface GetInputRequest {
  'filter'?: (_build_stack_inputstream_v1beta1_InputFilterOptions);
  /**
   * optional mask for specifying a subset of fields
   */
  'mask'?: (_google_protobuf_FieldMask);
}

export interface GetInputRequest__Output {
  'filter'?: (_build_stack_inputstream_v1beta1_InputFilterOptions__Output);
  /**
   * optional mask for specifying a subset of fields
   */
  'mask'?: (_google_protobuf_FieldMask__Output);
}
