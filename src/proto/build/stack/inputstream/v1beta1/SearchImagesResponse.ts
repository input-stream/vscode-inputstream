// Original file: proto/inputstream.proto

import type { SearchImage as _build_stack_inputstream_v1beta1_SearchImage, SearchImage__Output as _build_stack_inputstream_v1beta1_SearchImage__Output } from '../../../../build/stack/inputstream/v1beta1/SearchImage';
import type { Long } from '@grpc/proto-loader';

export interface SearchImagesResponse {
  'image'?: (_build_stack_inputstream_v1beta1_SearchImage)[];
  'nextPage'?: (number);
  'totalImages'?: (number | string | Long);
}

export interface SearchImagesResponse__Output {
  'image': (_build_stack_inputstream_v1beta1_SearchImage__Output)[];
  'nextPage': (number);
  'totalImages': (Long);
}
