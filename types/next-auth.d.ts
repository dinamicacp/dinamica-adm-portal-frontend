import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: number | null;
  }

  interface Session {
    accessToken?: string;
    error?: "RefreshAccessTokenError" | "MissingAccessToken";
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: number;
    authError?: "RefreshAccessTokenError" | "MissingAccessToken";
  }
}
