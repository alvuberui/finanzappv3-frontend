// src/app/lib/auth.ts
import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

type Token = {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: number; // epoch ms
  email?: string;
  error?: "RefreshAccessTokenError" | "NoRefreshToken" | "MissingKeycloakEnv";
  [key: string]: any;
};

async function refreshAccessToken(token: Token): Promise<Token> {
  try {
    const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
    const clientId = process.env.AUTH_KEYCLOAK_ID;
    const clientSecret = process.env.AUTH_KEYCLOAK_SECRET;

    if (!issuer || !clientId || !clientSecret) {
      console.error("Missing Keycloak envs", {
        AUTH_KEYCLOAK_ISSUER: !!issuer,
        AUTH_KEYCLOAK_ID: !!clientId,
        AUTH_KEYCLOAK_SECRET: !!clientSecret,
      });
      return { ...token, error: "MissingKeycloakEnv" };
    }

    if (!token.refreshToken) return { ...token, error: "NoRefreshToken" };

    const res = await fetch(`${issuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: token.refreshToken,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Keycloak refresh failed:", res.status, txt);

      return {
        ...token,
        accessToken: undefined,
        refreshToken: undefined,
        expiresAt: 0,
        error: "RefreshAccessTokenError",
      };
    }

    const refreshed = await res.json();

    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      // id_token normalmente NO viene en refresh; conservamos el anterior
      idToken: token.idToken,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
      error: undefined,
    };
  } catch (e) {
    console.error("refreshAccessToken exception:", e);
    return {
      ...token,
      accessToken: undefined,
      refreshToken: undefined,
      expiresAt: 0,
      error: "RefreshAccessTokenError",
    };
  }
}

export const {
  auth,
  signIn,
  signOut,
  handlers: { GET, POST },
} = NextAuth({
  debug: true,
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  providers: [
    Keycloak({
      issuer: process.env.AUTH_KEYCLOAK_ISSUER!,
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
      client: { token_endpoint_auth_method: "client_secret_post" },
      checks: ["pkce", "state"],
      authorization: { params: { scope: "openid profile email" } },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.preferred_username ?? profile.name ?? profile.email,
          email: profile.email,
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, account, profile }: any) {
      const t = token as Token;

      // email desde profile
      if (profile?.email && !t.email) t.email = profile.email;

      // Login inicial
      if (account?.access_token) {
        t.accessToken = account.access_token;
        t.refreshToken = account.refresh_token;
        t.idToken = account.id_token; // ✅ CLAVE para logout perfecto
        t.expiresAt = Date.now() + account.expires_in * 1000;
        t.error = undefined;
        return t;
      }

      // Si aún es válido (margen 60s)
      if (t.expiresAt && Date.now() < t.expiresAt - 60_000) return t;

      // Si ya falló antes, NO reintentar
      if (t.error === "RefreshAccessTokenError" || t.error === "NoRefreshToken") {
        return t;
      }

      // Caducado -> refresh
      return await refreshAccessToken(t);
    },

    async session({ session, token }: any) {
      session.user = session.user ?? {};
      (session.user as any).email = token.email;

      (session as any).tokenError = (token as any).error;
      (session as any).accessToken = (token as any).accessToken;
      (session as any).idToken = (token as any).idToken; // ✅ CLAVE

      return session;
    },
  },
});
