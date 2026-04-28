"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { createTenantDb, db } from "@repo/db";
import { waRotatorAgents, waRotatorClicks } from "@repo/db/schema/tenant";
import { expoEvents } from "@repo/db/schema/public";
import { requireRoles } from "@/lib/admin-auth";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

async function getEventId() {
  const event = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.schemaName, TENANT_SCHEMA),
  });
  if (!event) throw new Error("Event tidak ditemukan.");
  return event.id;
}

export async function getWaRotatorAgents() {
  await requireRoles(["finance", "admin"]);
  const tenantDb = await createTenantDb(TENANT_SCHEMA);
  return tenantDb.query.waRotatorAgents.findMany({
    orderBy: [asc(waRotatorAgents.sortOrder), asc(waRotatorAgents.createdAt)],
  });
}

export async function createWaRotatorAgent(data: {
  name: string;
  greetingName: string;
  waNumber: string;
  sortOrder?: number;
}) {
  await requireRoles([]);
  const tenantDb = await createTenantDb(TENANT_SCHEMA);
  const eventId = await getEventId();
  await tenantDb.insert(waRotatorAgents).values({
    eventId,
    name: data.name.trim(),
    greetingName: data.greetingName.trim(),
    waNumber: data.waNumber.trim().replace(/^\+/, ""),
    sortOrder: data.sortOrder ?? 0,
  });
  revalidatePath("/admin/whatsapp-rotator");
  return { success: true };
}

export async function updateWaRotatorAgent(
  id: string,
  data: { name?: string; greetingName?: string; waNumber?: string; sortOrder?: number; isActive?: boolean }
) {
  await requireRoles([]);
  const tenantDb = await createTenantDb(TENANT_SCHEMA);
  await tenantDb
    .update(waRotatorAgents)
    .set({
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.greetingName !== undefined && { greetingName: data.greetingName.trim() }),
      ...(data.waNumber !== undefined && { waNumber: data.waNumber.trim().replace(/^\+/, "") }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(waRotatorAgents.id, id));
  revalidatePath("/admin/whatsapp-rotator");
  return { success: true };
}

export async function deleteWaRotatorAgent(id: string) {
  await requireRoles([]);
  const tenantDb = await createTenantDb(TENANT_SCHEMA);
  await tenantDb.delete(waRotatorAgents).where(eq(waRotatorAgents.id, id));
  revalidatePath("/admin/whatsapp-rotator");
  return { success: true };
}

export async function resetWaRotatorCounters() {
  await requireRoles([]);
  const tenantDb = await createTenantDb(TENANT_SCHEMA);
  const eventId = await getEventId();
  await tenantDb
    .update(waRotatorAgents)
    .set({ totalClicks: 0, updatedAt: new Date() })
    .where(eq(waRotatorAgents.eventId, eventId));
  await tenantDb.delete(waRotatorClicks).where(eq(waRotatorClicks.eventId, eventId));
  revalidatePath("/admin/whatsapp-rotator");
  return { success: true };
}
