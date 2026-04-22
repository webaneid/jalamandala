"use server";

import { randomUUID, scrypt, randomBytes } from "node:crypto";
import { eq, desc, inArray, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@repo/db";
import { user, userRoles, account } from "@repo/db/schema/public";
import type { UserRole } from "@/lib/user-roles";

// Format identik dengan Better Auth (@better-auth/utils/password)
function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, key) => {
        if (err) reject(err);
        else resolve(`${salt}:${(key as Buffer).toString("hex")}`);
      }
    );
  });
}

export async function getUsers() {
  const users = await db.select().from(user).orderBy(desc(user.createdAt));

  if (users.length === 0) return [];

  const roles = await db
    .select()
    .from(userRoles)
    .where(inArray(userRoles.userId, users.map((u) => u.id)));

  return users.map((u) => ({
    ...u,
    roles: roles.filter((r) => r.userId === u.id),
  }));
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) {
  const trimmedEmail = data.email.trim().toLowerCase();

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, trimmedEmail))
    .limit(1);
  if (existing.length > 0) {
    return { success: false, error: "Email sudah terdaftar." };
  }

  try {
    const now = new Date();
    const userId = randomUUID();
    const passwordHash = await hashPassword(data.password);

    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: userId,
        name: data.name.trim(),
        email: trimmedEmail,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(account).values({
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(userRoles).values({
        userId,
        role: data.role,
        eventId: null,
      });
    });

    revalidatePath("/admin/pengguna");
    return { success: true };
  } catch (err) {
    console.error("createUser failed:", err);
    return { success: false, error: "Gagal membuat user." };
  }
}

export async function addUserRole(data: {
  userId: string;
  role: UserRole;
}) {
  // Cek duplikat (role yang sama untuk user yang sama, event_id null)
  const existing = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.userId, data.userId), eq(userRoles.role, data.role)))
    .limit(1);

  if (existing.length > 0) {
    return { success: false, error: "Role tersebut sudah dimiliki user ini." };
  }

  try {
    await db.insert(userRoles).values({
      userId: data.userId,
      role: data.role,
      eventId: null,
    });

    revalidatePath("/admin/pengguna");
    return { success: true };
  } catch (err) {
    console.error("addUserRole failed:", err);
    return { success: false, error: "Gagal menambah role." };
  }
}

export async function removeUserRole(roleId: string) {
  try {
    await db.delete(userRoles).where(eq(userRoles.id, roleId));
    revalidatePath("/admin/pengguna");
    return { success: true };
  } catch (err) {
    console.error("removeUserRole failed:", err);
    return { success: false, error: "Gagal menghapus role." };
  }
}
