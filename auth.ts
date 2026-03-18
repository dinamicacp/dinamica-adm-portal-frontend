import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const authProviderBaseUrl = process.env.AUTH_PROVIDER_BASE_URL;
const authProviderLoginPath = process.env.AUTH_PROVIDER_LOGIN_PATH ?? "/login";

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

        if (
          typeof body !== "object" ||
          body === null ||
          !("token" in body) ||
          typeof body.token !== "string" ||
          body.token.length === 0
        ) {
          return null;
        }

        return {
          id: username,
          name: username,
          email: username,
          accessToken: body.token,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.accessToken = user.accessToken;
      }

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

      return session;
    },
  },
});
