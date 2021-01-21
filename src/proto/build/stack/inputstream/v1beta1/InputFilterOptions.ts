// Original file: proto/inputstream.proto

import type { _build_stack_inputstream_v1beta1_Input_Status } from '../../../../build/stack/inputstream/v1beta1/Input';

export interface InputFilterOptions {
  /**
   * filter by owner
   */
  'owner'?: (string);
  /**
   * filter by login name
   */
  'login'?: (string);
  /**
   * filter by id
   */
  'id'?: (string);
  /**
   * filter by title_slug
   */
  'titleSlug'?: (string);
  /**
   * filter by tag
   */
  'tag'?: (string);
  /**
   * filter by input status
   */
  'status'?: (_build_stack_inputstream_v1beta1_Input_Status | keyof typeof _build_stack_inputstream_v1beta1_Input_Status);
}

export interface InputFilterOptions__Output {
  /**
   * filter by owner
   */
  'owner': (string);
  /**
   * filter by login name
   */
  'login': (string);
  /**
   * filter by id
   */
  'id': (string);
  /**
   * filter by title_slug
   */
  'titleSlug': (string);
  /**
   * filter by tag
   */
  'tag': (string);
  /**
   * filter by input status
   */
  'status': (_build_stack_inputstream_v1beta1_Input_Status);
}
