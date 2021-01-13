// Original file: proto/auth.proto

import type { User as _build_stack_auth_v1beta1_User, User__Output as _build_stack_auth_v1beta1_User__Output } from '../../../../build/stack/auth/v1beta1/User';
import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../../../google/protobuf/Timestamp';

export interface LoginResponse {
  /**
   * the user details
   */
  'user'?: (_build_stack_auth_v1beta1_User);
  /**
   * a jwt token that can be used for subsequent auth
   */
  'token'?: (string);
  /**
   * date at which the token is expected to expire
   */
  'expiresAt'?: (_google_protobuf_Timestamp);
}

export interface LoginResponse__Output {
  /**
   * the user details
   */
  'user'?: (_build_stack_auth_v1beta1_User__Output);
  /**
   * a jwt token that can be used for subsequent auth
   */
  'token': (string);
  /**
   * date at which the token is expected to expire
   */
  'expiresAt'?: (_google_protobuf_Timestamp__Output);
}
