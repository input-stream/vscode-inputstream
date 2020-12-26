// Original file: proto/inputstream.proto

import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../../../google/protobuf/Timestamp';
import type { UnsplashUser as _build_stack_inputstream_v1beta1_UnsplashUser, UnsplashUser__Output as _build_stack_inputstream_v1beta1_UnsplashUser__Output } from '../../../../build/stack/inputstream/v1beta1/UnsplashUser';

export interface UnsplashImage {
  'id'?: (string);
  'url'?: (string);
  'width'?: (number);
  'height'?: (number);
  'color'?: (string);
  'createdAt'?: (_google_protobuf_Timestamp);
  'updatedAt'?: (_google_protobuf_Timestamp);
  'user'?: (_build_stack_inputstream_v1beta1_UnsplashUser);
}

export interface UnsplashImage__Output {
  'id': (string);
  'url': (string);
  'width': (number);
  'height': (number);
  'color': (string);
  'createdAt'?: (_google_protobuf_Timestamp__Output);
  'updatedAt'?: (_google_protobuf_Timestamp__Output);
  'user'?: (_build_stack_inputstream_v1beta1_UnsplashUser__Output);
}
