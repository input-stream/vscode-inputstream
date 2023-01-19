// Original file: proto/inputstream.proto

import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../../../google/protobuf/Timestamp';
import type { Long } from '@grpc/proto-loader';

export interface File {
  'sha256'?: (string);
  'name'?: (string);
  'size'?: (number | string | Long);
  'mode'?: (number);
  'contentType'?: (string);
  'createdAt'?: (_google_protobuf_Timestamp | null);
  'modifiedAt'?: (_google_protobuf_Timestamp | null);
}

export interface File__Output {
  'sha256': (string);
  'name': (string);
  'size': (Long);
  'mode': (number);
  'contentType': (string);
  'createdAt': (_google_protobuf_Timestamp__Output | null);
  'modifiedAt': (_google_protobuf_Timestamp__Output | null);
}
