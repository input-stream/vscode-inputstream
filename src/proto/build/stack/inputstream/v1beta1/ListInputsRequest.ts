// Original file: proto/inputstream.proto

import type { InputFilterOptions as _build_stack_inputstream_v1beta1_InputFilterOptions, InputFilterOptions__Output as _build_stack_inputstream_v1beta1_InputFilterOptions__Output } from '../../../../build/stack/inputstream/v1beta1/InputFilterOptions';

export interface ListInputsRequest {
  'filter'?: (_build_stack_inputstream_v1beta1_InputFilterOptions);
  'wantPrivate'?: (boolean);
}

export interface ListInputsRequest__Output {
  'filter'?: (_build_stack_inputstream_v1beta1_InputFilterOptions__Output);
  'wantPrivate': (boolean);
}
