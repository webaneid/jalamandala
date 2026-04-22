"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { createTenantDb, db } from "@repo/db";
import { expoEvents } from "@repo/db/schema/public";
import { zonePriceRules } from "@repo/db/schema/tenant";
import { type PricePhase, wibInputToDate } from "@/lib/price-phase";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

export async function updatePricePhaseSchedule(payload: {
  phase: PricePhase;
  startsAt: string | null;
  endsAt: string | null;
}) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const startsAt = wibInputToDate(payload.startsAt);
    const endsAt = wibInputToDate(payload.endsAt);

    await tenantDb
      .update(zonePriceRules)
      .set({ startsAt, endsAt, updatedAt: new Date() })
      .where(eq(zonePriceRules.pricePhase, payload.phase));

    revalidatePath("/admin/setting");
    revalidatePath("/admin/keuangan/tambah-tagihan");
    const activeEvents = await db.query.expoEvents.findMany({
      columns: { slug: true },
      where: eq(expoEvents.isActive, true),
    });
    for (const event of activeEvents) {
      revalidatePath(`/${event.slug}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Error updating price phase schedule:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan jadwal fase harga.",
    };
  }
}

export async function readPricePhaseSchedules(): Promise<
  Array<{ phase: PricePhase; startsAt: string | null; endsAt: string | null }>
> {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const rows = await tenantDb.query.zonePriceRules.findMany({
      where: eq(zonePriceRules.isActive, true),
      orderBy: (table) => [asc(table.pricePhase)],
    });

    const phases: PricePhase[] = ["early_bird", "pre_sale", "regular"];
    return phases.map((phase) => {
      const row = rows.find((r) => r.pricePhase === phase);
      return {
        phase,
        startsAt: row?.startsAt ? row.startsAt.toISOString() : null,
        endsAt: row?.endsAt ? row.endsAt.toISOString() : null,
      };
    });
  } catch {
    return [];
  }
}
