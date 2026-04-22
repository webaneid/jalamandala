import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@repo/db';
import * as schema from '@repo/db/schema/public';

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  // Izinkan request dari semua subdomain app di localhost (dev) dan domain produksi
  trustedOrigins: [
    'http://app.localhost:6250',
    'http://expo.localhost:6250',
    'http://localhost:6250',
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
  ],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // Registrasi publik dimatikan — user hanya bisa ditambah oleh Super Admin
    disableSignUp: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 hari
    updateAge: 60 * 60 * 24,      // refresh tiap hari
  },
});

export type Session = typeof auth.$Infer.Session;
