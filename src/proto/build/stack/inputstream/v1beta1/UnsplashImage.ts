// Original file: proto/inputstream.proto

import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../../../google/protobuf/Timestamp';
import type { UnsplashUser as _build_stack_inputstream_v1beta1_UnsplashUser, UnsplashUser__Output as _build_stack_inputstream_v1beta1_UnsplashUser__Output } from '../../../../build/stack/inputstream/v1beta1/UnsplashUser';

export interface UnsplashImage {
  'id'?: (string);
  'rawUrl'?: (string);
  'fullUrl'?: (string);
  'regularUrl'?: (string);
  'smallUrl'?: (string);
  'thumbUrl'?: (string);
  'width'?: (number);
  'height'?: (number);
  'color'?: (string);
  'createdAt'?: (_google_protobuf_Timestamp | null);
  'updatedAt'?: (_google_protobuf_Timestamp | null);
  'user'?: (_build_stack_inputstream_v1beta1_UnsplashUser | null);
}

export interface UnsplashImage__Output {
  'id': (string);
  'rawUrl': (string);
  'fullUrl': (string);
  'regularUrl': (string);
  'smallUrl': (string);
  'thumbUrl': (string);
  'width': (number);
  'height': (number);
  'color': (string);
  'createdAt': (_google_protobuf_Timestamp__Output | null);
  'updatedAt': (_google_protobuf_Timestamp__Output | null);
  'user': (_build_stack_inputstream_v1beta1_UnsplashUser__Output | null);
}
