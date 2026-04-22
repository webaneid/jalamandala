"use server";

import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@repo/db";
import { forbisMembers } from "@repo/db/schema/public";

function buildImportKey(fields: {
  forbisMemberId: string;
  name: string;
  companyName: string;
  boothName: string;
  brandName: string;
}): string {
  const value = [
    fields.forbisMemberId,
    fields.name,
    fields.companyName,
    fields.boothName,
    fields.brandName,
  ]
    .map((s) => (s ?? "").trim().toLowerCase())
    .join("|");
  return createHash("sha256").update(value).digest("hex");
}

export type ForbisMemberPayload = {
  name: string;
  forbisMemberId?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  isKmiAlumni?: boolean;
  kmiYear?: string;
  companyName?: string;
  boothName?: string;
  brandName?: string;
};

export async function createForbisMember(data: ForbisMemberPayload) {
  try {
    const importKey = buildImportKey({
      forbisMemberId: data.forbisMemberId ?? "",
      name: data.name,
      companyName: data.companyName ?? "",
      boothName: data.boothName ?? "",
      brandName: data.brandName ?? "",
    });

    await db.insert(forbisMembers).values({
      id: randomUUID(),
      name: data.name.trim(),
      forbisMemberId: data.forbisMemberId?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      whatsapp: data.whatsapp?.trim() || null,
      isKmiAlumni: data.isKmiAlumni ?? false,
      kmiYear: data.kmiYear?.trim() || null,
      companyName: data.companyName?.trim() || null,
      boothName: data.boothName?.trim() || null,
      brandName: data.brandName?.trim() || null,
      importKey,
      isActive: true,
    });

    revalidatePath("/admin/anggota-forbis");
    return { success: true };
  } catch (err) {
    console.error("createForbisMember failed:", err);
    return { success: false, error: "Gagal menambah anggota." };
  }
}

export async function updateForbisMember(id: string, data: ForbisMemberPayload) {
  try {
    const importKey = buildImportKey({
      forbisMemberId: data.forbisMemberId ?? "",
      name: data.name,
      companyName: data.companyName ?? "",
      boothName: data.boothName ?? "",
      brandName: data.brandName ?? "",
    });

    await db
      .update(forbisMembers)
      .set({
        name: data.name.trim(),
        forbisMemberId: data.forbisMemberId?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        whatsapp: data.whatsapp?.trim() || null,
        isKmiAlumni: data.isKmiAlumni ?? false,
        kmiYear: data.kmiYear?.trim() || null,
        companyName: data.companyName?.trim() || null,
        boothName: data.boothName?.trim() || null,
        brandName: data.brandName?.trim() || null,
        importKey,
        updatedAt: new Date(),
      })
      .where(eq(forbisMembers.id, id));

    revalidatePath("/admin/anggota-forbis");
    return { success: true };
  } catch (err) {
    console.error("updateForbisMember failed:", err);
    return { success: false, error: "Gagal memperbarui anggota." };
  }
}

export async function deleteForbisMember(id: string) {
  try {
    await db.delete(forbisMembers).where(eq(forbisMembers.id, id));
    revalidatePath("/admin/anggota-forbis");
    return { success: true };
  } catch (err) {
    console.error("deleteForbisMember failed:", err);
    return { success: false, error: "Gagal menghapus anggota." };
  }
}
