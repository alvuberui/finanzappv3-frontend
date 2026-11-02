import "next-auth";

declare module "next-auth" {
  interface Session {
    tokenError?: string;
    accessToken?: string;
    idToken?: string;
    expiresAt?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    expiresAt?: number;
    error?: "RefreshAccessTokenError" | "NoRefreshToken" | "MissingKeycloakEnv";
  }
}
