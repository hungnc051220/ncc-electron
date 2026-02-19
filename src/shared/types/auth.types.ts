export interface JwtPayload {
  exp: number;
  iat: number;
  jti: string;
  iss: string;
  aud: string[];
  sub: string;
  typ: string;
  azp: string;
  sid: string;
  acr: string;
  "allowed-origins": string[];
  realm_access: RealmAccess;
  resource_access: ResourceAccess;
  scope: string;
  store_id: string;
  email_verified: boolean;
  user_id: string;
  preferred_username: string;
}

export interface RealmAccess {
  roles: string[];
}

export interface ResourceAccess {
  "realm-management": RealmManagement;
  account: Account;
}

export interface RealmManagement {
  roles: string[];
}

export interface Account {
  roles: string[];
}
