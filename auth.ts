// Auth.js v5 (next-auth beta) — Google sign-in only, minimal scopes.
// JWT sessions (not database sessions) so the proxy can read role /
// adminRole / totpVerifiedAt from the token with no DB round-trip.
// Credentials come ONLY from env vars; nothing is hardcoded here.
// When DATABASE_URL is unset the adapter is omitted and auth features show a
// "not configured" state while the PDF tools keep working as guest tools.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./lib/prisma";
import { adminEmails } from "./lib/security";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authConfigured = Boolean(process.env.AUTH_SECRET && googleConfigured);

// Session-flag update helper: Auth.js v5 types `update()` as Partial<Session>,
// but the JWT callback legitimately receives whatever object update() was given
// (Auth.js docs: the `session` param IS the update payload). Custom flags such
// as totpVerifiedAt / ageConfirmed therefore travel through this cast.
export async function updateSessionFlags(fields: Record<string, unknown>) {
  await unstable_update(fields as never);
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  adapter: prisma ? PrismaAdapter(prisma) : undefined,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: { params: { scope: "openid email profile" } },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // First sign-in: load the DB user and bootstrap admin role.
      if (user?.email && prisma) {
        try {
          let dbUser = await prisma.user.findUnique({ where: { email: user.email } });
          const allowlisted = adminEmails().includes(user.email.toLowerCase());
          if (dbUser && allowlisted && !dbUser.adminRole) {
            dbUser = await prisma.user.update({
              where: { id: dbUser.id },
              data: { role: "ADMIN", adminRole: "SUPER" },
            });
          }
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.adminRole = dbUser.adminRole ?? null;
            token.plan = dbUser.plan;
            token.ageConfirmed = dbUser.ageConfirmed;
            token.status = dbUser.status;
          }
        } catch {
          // DB unavailable: keep the token minimal; tools still work.
        }
        token.totpVerifiedAt = null; // admins re-verify TOTP each sign-in
        token.email = user.email;
        token.name = user.name ?? token.name;
        token.picture = user.image ?? token.picture;
      }
      // Client/server session update(): refresh from DB + accept fresh flags.
      if (trigger === "update") {
        const s = session as Record<string, unknown> | undefined;
        if (s?.totpVerifiedAt) token.totpVerifiedAt = s.totpVerifiedAt as string;
        if (s?.ageConfirmed) token.ageConfirmed = true;
        if (token.email && prisma) {
          try {
            const dbUser = await prisma.user.findUnique({ where: { email: String(token.email) } });
            if (dbUser) {
              token.role = dbUser.role;
              token.adminRole = dbUser.adminRole ?? null;
              token.plan = dbUser.plan;
              token.ageConfirmed = dbUser.ageConfirmed;
              token.status = dbUser.status;
            }
          } catch {
            // keep existing token values
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      const u = session.user as unknown as Record<string, unknown>;
      u.id = token.id ?? token.sub ?? "";
      u.role = token.role ?? "USER";
      u.adminRole = token.adminRole ?? null;
      u.plan = token.plan ?? "FREE";
      u.totpVerifiedAt = token.totpVerifiedAt ?? null;
      u.ageConfirmed = token.ageConfirmed ?? false;
      u.status = token.status ?? "ACTIVE";
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!prisma || !user.email) return;
      try {
        await prisma.user.update({
          where: { email: user.email },
          data: { lastLoginAt: new Date() },
        });
      } catch {
        // ignore
      }
    },
  },
});
