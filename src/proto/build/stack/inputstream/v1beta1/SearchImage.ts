// Original file: proto/inputstream.proto

import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../../../google/protobuf/Timestamp';
import type { SearchUser as _build_stack_inputstream_v1beta1_SearchUser, SearchUser__Output as _build_stack_inputstream_v1beta1_SearchUser__Output } from '../../../../build/stack/inputstream/v1beta1/SearchUser';

export interface SearchImage {
  'id'?: (string);
  'url'?: (string);
  'width'?: (number);
  'height'?: (number);
  'color'?: (string);
  'createdAt'?: (_google_protobuf_Timestamp);
  'updatedAt'?: (_google_protobuf_Timestamp);
  'user'?: (_build_stack_inputstream_v1beta1_SearchUser);
}

export interface SearchImage__Output {
  'id': (string);
  'url': (string);
  'width': (number);
  'height': (number);
  'color': (string);
  'createdAt'?: (_google_protobuf_Timestamp__Output);
  'updatedAt'?: (_google_protobuf_Timestamp__Output);
  'user'?: (_build_stack_inputstream_v1beta1_SearchUser__Output);
}
