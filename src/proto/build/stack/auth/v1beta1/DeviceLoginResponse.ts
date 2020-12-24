// Original file: proto/auth.proto

import type { User as _build_stack_auth_v1beta1_User, User__Output as _build_stack_auth_v1beta1_User__Output } from '../../../../build/stack/auth/v1beta1/User';
import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../../../../google/protobuf/Timestamp';

export interface DeviceLoginResponse {
  /**
   * the URL where the user can perform oauth in the browser.
   * this will be populated after the first stream response.
   */
  'oauthUrl'?: (string);
  /**
   * a boolean that signals when the device has logged in.
   * in the case the user and token should be populated.
   */
  'completed'?: (boolean);
  /**
   * the user details
   */
  'user'?: (_build_stack_auth_v1beta1_User);
  /**
   * a jwt token that can be used for subsequent access (an access_token).
   */
  'accessToken'?: (string);
  /**
   * date at which the access_token is expected to expire
   */
  'expiresAt'?: (_google_protobuf_Timestamp);
  /**
   * a different token that can be used for retrieving new access tokens.  This
   * is only populated by interacting with the oauth_url.
   */
  'refreshToken'?: (string);
}

export interface DeviceLoginResponse__Output {
  /**
   * the URL where the user can perform oauth in the browser.
   * this will be populated after the first stream response.
   */
  'oauthUrl': (string);
  /**
   * a boolean that signals when the device has logged in.
   * in the case the user and token should be populated.
   */
  'completed': (boolean);
  /**
   * the user details
   */
  'user'?: (_build_stack_auth_v1beta1_User__Output);
  /**
   * a jwt token that can be used for subsequent access (an access_token).
   */
  'accessToken': (string);
  /**
   * date at which the access_token is expected to expire
   */
  'expiresAt'?: (_google_protobuf_Timestamp__Output);
  /**
   * a different token that can be used for retrieving new access tokens.  This
   * is only populated by interacting with the oauth_url.
   */
  'refreshToken': (string);
}
