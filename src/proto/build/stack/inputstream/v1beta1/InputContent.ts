// Original file: proto/inputstream.proto

import type { Any as _google_protobuf_Any, Any__Output as _google_protobuf_Any__Output } from '../../../../google/protobuf/Any';
import type { ShortPostInputContent as _build_stack_inputstream_v1beta1_ShortPostInputContent, ShortPostInputContent__Output as _build_stack_inputstream_v1beta1_ShortPostInputContent__Output } from '../../../../build/stack/inputstream/v1beta1/ShortPostInputContent';

export interface InputContent {
  /**
   * any type, for dynamic case
   */
  'any'?: (_google_protobuf_Any);
  /**
   * short post form
   */
  'shortPost'?: (_build_stack_inputstream_v1beta1_ShortPostInputContent);
  'value'?: "any"|"shortPost";
}

export interface InputContent__Output {
  /**
   * any type, for dynamic case
   */
  'any'?: (_google_protobuf_Any__Output);
  /**
   * short post form
   */
  'shortPost'?: (_build_stack_inputstream_v1beta1_ShortPostInputContent__Output);
  'value': "any"|"shortPost";
}
