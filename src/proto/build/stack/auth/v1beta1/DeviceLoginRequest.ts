// Original file: proto/auth.proto


export interface DeviceLoginRequest {
  /**
   * The name of the client application
   */
  'deviceName'?: (string);
  /**
   * refresh_token can be used to request a new access token without expecting
   * the user to have to interact with the oauth_url.
   */
  'refreshToken'?: (string);
}

export interface DeviceLoginRequest__Output {
  /**
   * The name of the client application
   */
  'deviceName': (string);
  /**
   * refresh_token can be used to request a new access token without expecting
   * the user to have to interact with the oauth_url.
   */
  'refreshToken': (string);
}
