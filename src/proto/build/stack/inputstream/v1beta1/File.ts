// Original file: proto/inputstream.proto

import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../../../google/protobuf/Timestamp';
import type { ImageInfo as _build_stack_inputstream_v1beta1_ImageInfo, ImageInfo__Output as _build_stack_inputstream_v1beta1_ImageInfo__Output } from '../../../../build/stack/inputstream/v1beta1/ImageInfo';
import type { LanguageInfo as _build_stack_inputstream_v1beta1_LanguageInfo, LanguageInfo__Output as _build_stack_inputstream_v1beta1_LanguageInfo__Output } from '../../../../build/stack/inputstream/v1beta1/LanguageInfo';
import type { Long } from '@grpc/proto-loader';

export interface File {
  'sha256'?: (string);
  'name'?: (string);
  'size'?: (number | string | Long);
  'mode'?: (number);
  'contentType'?: (string);
  'createdAt'?: (_google_protobuf_Timestamp | null);
  'modifiedAt'?: (_google_protobuf_Timestamp | null);
  /**
   * optional data if stored inline
   */
  'data'?: (Buffer | Uint8Array | string);
  'imageInfo'?: (_build_stack_inputstream_v1beta1_ImageInfo | null);
  'languageInfo'?: (_build_stack_inputstream_v1beta1_LanguageInfo | null);
}

export interface File__Output {
  'sha256': (string);
  'name': (string);
  'size': (Long);
  'mode': (number);
  'contentType': (string);
  'createdAt': (_google_protobuf_Timestamp__Output | null);
  'modifiedAt': (_google_protobuf_Timestamp__Output | null);
  /**
   * optional data if stored inline
   */
  'data': (Buffer);
  'imageInfo': (_build_stack_inputstream_v1beta1_ImageInfo__Output | null);
  'languageInfo': (_build_stack_inputstream_v1beta1_LanguageInfo__Output | null);
}
