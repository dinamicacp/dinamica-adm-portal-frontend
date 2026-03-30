import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: number | null;
    organizationalUnit?: string;
  }

  interface Session {
    accessToken?: string;
    organizationalUnit?: string;
    error?: "RefreshAccessTokenError" | "MissingAccessToken" | "UnauthorizedOrganizationalUnit";
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
    organizationalUnit?: string;
    authError?: "RefreshAccessTokenError" | "MissingAccessToken" | "UnauthorizedOrganizationalUnit";
  }
}
