// Original file: proto/inputstream.proto

import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../../../google/protobuf/Timestamp';

export interface User {
  'login'?: (string);
  'name'?: (string);
  'avatarUrl'?: (string);
  'bio'?: (string);
  'createdAt'?: (_google_protobuf_Timestamp);
}

export interface User__Output {
  'login': (string);
  'name': (string);
  'avatarUrl': (string);
  'bio': (string);
  'createdAt'?: (_google_protobuf_Timestamp__Output);
}
