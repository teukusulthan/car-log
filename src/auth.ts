import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import { db, schema } from "@/db";
import {
  LOGIN_CODE_MAX_AGE_SECONDS,
  generateLoginCode,
  normalizeEmail,
} from "@/lib/auth-utils";
import { sendLoginEmail } from "@/server/login-email";

export const EMAIL_PROVIDER_ID = "email";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  trustHost: true,
  session: { strategy: "database", maxAge: 90 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login/check-email",
  },
  providers: [
    {
      id: EMAIL_PROVIDER_ID,
      type: "email",
      name: "Email",
      from: "car-log",
      maxAge: LOGIN_CODE_MAX_AGE_SECONDS,
      options: {},
      generateVerificationToken: generateLoginCode,
      normalizeIdentifier: normalizeEmail,
      async sendVerificationRequest({ identifier, token, url }) {
        await sendLoginEmail({ to: identifier, code: token, url });
      },
    },
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
