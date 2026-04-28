import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { createTenantDb, db } from "@repo/db";
import { expoEvents } from "@repo/db/schema/public";
import { waRotatorAgents, waRotatorClicks } from "@repo/db/schema/tenant";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

const FALLBACK_MESSAGE = "Halo, saya ingin bertanya tentang pendaftaran booth FORBIS National Economic Summit 2026. Boleh dibantu? 🙏";

export async function GET(req: NextRequest) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    const event = await db.query.expoEvents.findFirst({
      where: eq(expoEvents.schemaName, TENANT_SCHEMA),
    });
    if (!event) {
      return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });
    }

    // Pilih agen dengan total_clicks terkecil (round-robin presisi)
    const agents = await tenantDb.query.waRotatorAgents.findMany({
      where: and(
        eq(waRotatorAgents.eventId, event.id),
        eq(waRotatorAgents.isActive, true)
      ),
      orderBy: [asc(waRotatorAgents.totalClicks), asc(waRotatorAgents.sortOrder)],
    });

    if (!agents.length) {
      return NextResponse.json({ error: "Tidak ada agen aktif." }, { status: 503 });
    }

    const agent = agents[0]!;

    // Atomic increment + log dalam satu transaksi
    await tenantDb.transaction(async (tx) => {
      await tx
        .update(waRotatorAgents)
        .set({ totalClicks: agent.totalClicks + 1, updatedAt: new Date() })
        .where(eq(waRotatorAgents.id, agent.id));
      await tx.insert(waRotatorClicks).values({
        agentId: agent.id,
        eventId: event.id,
        source: "public_bottom_nav",
      });
    });

    const message = `Halo ${agent.greetingName}, saya ingin bertanya tentang pendaftaran booth FORBIS National Economic Summit 2026. Boleh dibantu? 🙏`;
    const url = `https://wa.me/${agent.waNumber}?text=${encodeURIComponent(message)}`;

    return NextResponse.redirect(url);
  } catch (err) {
    console.error("wa-rotator redirect error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
