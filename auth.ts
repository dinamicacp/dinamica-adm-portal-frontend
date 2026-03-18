import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const authProviderBaseUrl = process.env.AUTH_PROVIDER_BASE_URL;
const authProviderLoginPath = process.env.AUTH_PROVIDER_LOGIN_PATH ?? "/login";
const authProviderRefreshPath = process.env.AUTH_PROVIDER_REFRESH_PATH ?? "/refresh";
const tokenRefreshBufferSeconds = Number(process.env.AUTH_TOKEN_REFRESH_BUFFER_SECONDS ?? "60");

type JwtPayload = {
  exp?: number;
};

type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};

function decodeJwtPayload(jwt: string): JwtPayload | null {
  const parts = jwt.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddingLength = (4 - (base64.length % 4)) % 4;
    const padded = `${base64}${"=".repeat(paddingLength)}`;
    const payloadJson = Buffer.from(padded, "base64").toString("utf-8");
    const payload = JSON.parse(payloadJson) as JwtPayload;

    return payload;
  } catch {
    return null;
  }
}

function parseAuthTokens(body: unknown): AuthTokens | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  if (!("accessToken" in body) || typeof body.accessToken !== "string" || body.accessToken.length === 0) {
    return null;
  }

  const refreshToken =
    "refreshToken" in body && typeof body.refreshToken === "string" && body.refreshToken.length > 0
      ? body.refreshToken
      : undefined;

  const expiresIn =
    "expiresIn" in body &&
    (typeof body.expiresIn === "number" || typeof body.expiresIn === "string")
      ? Number(body.expiresIn)
      : undefined;

  const normalizedExpiresIn =
    typeof expiresIn === "number" && Number.isFinite(expiresIn) && expiresIn > 0
      ? expiresIn
      : undefined;

  return {
    accessToken: body.accessToken,
    refreshToken,
    expiresIn: normalizedExpiresIn,
  };
}

function getExpiresAtFromExpiresIn(expiresIn?: number): number | null {
  if (typeof expiresIn !== "number" || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    return null;
  }

  return Date.now() + expiresIn * 1000;
}

function getAccessTokenExpiresAt(accessToken: string): number | null {
  const payload = decodeJwtPayload(accessToken);

  if (!payload || typeof payload.exp !== "number") {
    return null;
  }

  return payload.exp * 1000;
}

function shouldRefreshToken(expiresAt: number | null): boolean {
  if (!expiresAt) {
    return true;
  }

  const refreshAt = expiresAt - tokenRefreshBufferSeconds * 1000;
  return Date.now() >= refreshAt;
}

async function refreshAccessToken(
  _currentAccessToken: string,
  refreshToken?: string,
): Promise<{ accessToken: string; accessTokenExpiresAt: number | null; refreshToken?: string } | null> {
  if (!authProviderBaseUrl || !authProviderRefreshPath) {
    return null;
  }

  if (!refreshToken) {
    return null;
  }

  const refreshUrl = new URL(authProviderRefreshPath, authProviderBaseUrl).toString();
  const response = await fetch(refreshUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken,
      grantType: "refresh_token",
    }),
  });

  if (!response.ok) {
    return null;
  }

  const body: unknown = await response.json();
  const tokens = parseAuthTokens(body);

  if (!tokens) {
    return null;
  }

  return {
    accessToken: tokens.accessToken,
    accessTokenExpiresAt:
      getExpiresAtFromExpiresIn(tokens.expiresIn) ?? getAccessTokenExpiresAt(tokens.accessToken),
    refreshToken: tokens.refreshToken,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credenciais",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username;
        const password = credentials?.password;

        if (typeof username !== "string" || typeof password !== "string") {
          return null;
        }

        if (!authProviderBaseUrl) {
          return null;
        }

        const loginUrl = new URL(authProviderLoginPath, authProviderBaseUrl).toString();
        const encodedCredentials = Buffer.from(`${username}:${password}`).toString("base64");

        const response = await fetch(loginUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${encodedCredentials}`,
          },
        });

        if (!response.ok) {
          return null;
        }

        const body: unknown = await response.json();
        const tokens = parseAuthTokens(body);

        if (!tokens) {
          return null;
        }

        return {
          id: username,
          name: username,
          email: username,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          accessTokenExpiresAt:
            getExpiresAtFromExpiresIn(tokens.expiresIn) ?? getAccessTokenExpiresAt(tokens.accessToken),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpiresAt = user.accessTokenExpiresAt;
        token.authError = undefined;
        return token;
      }

      if (typeof token.accessToken !== "string") {
        token.authError = "MissingAccessToken";
        return token;
      }

      const accessTokenExpiresAt =
        typeof token.accessTokenExpiresAt === "number"
          ? token.accessTokenExpiresAt
          : getAccessTokenExpiresAt(token.accessToken);

      token.accessTokenExpiresAt = accessTokenExpiresAt ?? undefined;

      if (!shouldRefreshToken(accessTokenExpiresAt)) {
        return token;
      }

      const currentRefreshToken =
        typeof token.refreshToken === "string" ? token.refreshToken : undefined;

      const refreshed = await refreshAccessToken(token.accessToken, currentRefreshToken);

      if (!refreshed) {
        token.authError = "RefreshAccessTokenError";
        token.accessToken = undefined;
        token.accessTokenExpiresAt = undefined;
        return token;
      }

      token.accessToken = refreshed.accessToken;
      token.refreshToken = refreshed.refreshToken ?? currentRefreshToken;
      token.accessTokenExpiresAt = refreshed.accessTokenExpiresAt ?? undefined;
      token.authError = undefined;

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      if (session.user && token.userId) {
        session.user.id = String(token.userId);
      }

      if (typeof token.accessToken === "string") {
        session.accessToken = token.accessToken;
      }

      if (
        token.authError === "MissingAccessToken" ||
        token.authError === "RefreshAccessTokenError"
      ) {
        session.error = token.authError;
      }

      return session;
    },
  },
});
