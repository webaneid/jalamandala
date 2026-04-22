import * as dotenv from 'dotenv';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { scrypt, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

dotenv.config({ path: '../../.env' });

const scryptAsync = promisify(scrypt);

// Harus identik dengan format Better Auth (@better-auth/utils/password):
// `${hex_salt}:${hex_key}` — scrypt N=16384, r=16, p=1, dkLen=64
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await scryptAsync(
    password.normalize('NFKC'),
    salt,
    64,
    { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 }
  ) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}

async function seedSuperAdmin() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  const email = 'salam@webane.com';
  const password = 'Bismillah*2026!';
  const name = 'Super Admin';

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    await sql.begin(async (tx) => {
      const now = new Date();
      const passwordHash = await hashPassword(password);

      // Upsert user
      await tx`
        INSERT INTO public."user" (id, name, email, email_verified, created_at, updated_at)
        VALUES (${randomUUID()}, ${name}, ${email}, true, ${now}, ${now})
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          email_verified = true,
          updated_at = ${now}
      `;

      const [{ id: userId }] = await tx<{ id: string }[]>`
        SELECT id FROM public."user" WHERE email = ${email}
      `;

      // Update password jika account sudah ada, insert jika belum
      const existing = await tx<{ id: string }[]>`
        SELECT id FROM public.account
        WHERE account_id = ${userId} AND provider_id = 'credential'
      `;
      if (existing.length > 0) {
        await tx`
          UPDATE public.account
          SET password = ${passwordHash}, updated_at = ${now}
          WHERE id = ${existing[0]!.id}
        `;
      } else {
        await tx`
          INSERT INTO public.account (id, account_id, provider_id, user_id, password, created_at, updated_at)
          VALUES (${randomUUID()}, ${userId}, 'credential', ${userId}, ${passwordHash}, ${now}, ${now})
        `;
      }

      // Tambah role super_admin jika belum ada
      await tx`
        INSERT INTO public.user_roles (user_id, role)
        SELECT ${userId}, 'super_admin'
        WHERE NOT EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = ${userId} AND role = 'super_admin'
        )
      `;

      console.log(`✓ Super Admin berhasil di-seed:`);
      console.log(`  Email   : ${email}`);
      console.log(`  User ID : ${userId}`);
    });
  } finally {
    await sql.end();
  }
}

seedSuperAdmin().catch((error) => {
  console.error('Seed super admin gagal:', error);
  process.exit(1);
});
