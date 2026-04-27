import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { createTenantDb, db } from "@repo/db";
import { expoEvents, participantBusinesses } from "@repo/db/schema/public";
import { invoices } from "@repo/db/schema/tenant";
import { sendWhatsApp } from "@/lib/whatsapp";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", timeZone: "Asia/Jakarta" }).format(d);

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    const event = await db.query.expoEvents.findFirst({
      where: eq(expoEvents.schemaName, TENANT_SCHEMA),
    });

    const financeNumbers: string[] = event?.financeWaNumbers ?? [];
    if (!financeNumbers.length) {
      return NextResponse.json({ ok: true, skipped: "no finance numbers" });
    }

    const unpaidInvoices = await tenantDb.query.invoices.findMany({
      where: and(
        eq(invoices.status, "waiting_for_payment"),
      ),
      orderBy: (t) => [asc(t.dueDate)],
    });

    const waitingConfirmation = await tenantDb.query.invoices.findMany({
      where: eq(invoices.status, "waiting_confirmation"),
      orderBy: (t) => [asc(t.dueDate)],
    });

    const allPending = [...unpaidInvoices, ...waitingConfirmation];

    if (allPending.length === 0) {
      return NextResponse.json({ ok: true, skipped: "no unpaid invoices" });
    }

    const businessIds = allPending.map((i) => i.businessId).filter(Boolean) as string[];
    const bizRows = businessIds.length > 0
      ? await db.query.participantBusinesses.findMany({
          where: inArray(participantBusinesses.id, businessIds),
          columns: { id: true, companyName: true },
        })
      : [];
    const bizMap = new Map(bizRows.map((b) => [b.id, b.companyName]));

    const now = new Date();
    const fmtDateFull = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta",
    }).format(now);

    const lines = allPending.map((inv, i) => {
      const company = (inv.businessId ? bizMap.get(inv.businessId) : null) ?? inv.recipientName ?? "-";
      const due = inv.dueDate ? fmtDate(inv.dueDate) : "?";
      const status = inv.status === "waiting_confirmation" ? "⏳menunggu verif" : "❌belum bayar";
      return `${i + 1}. ${company} — ${fmtRp(inv.grandTotal)} — JT: ${due} — ${status}`;
    });

    const totalValue = allPending.reduce((s, i) => s + i.grandTotal, 0);
    const message = `💰 *Tagihan Belum Selesai — ${fmtDateFull}*\n\n${lines.join("\n")}\n\n*Total: ${allPending.length} tagihan | ${fmtRp(totalValue)}*`;

    for (const number of financeNumbers) {
      await sendWhatsApp({ to: number, message, context: "finance-unpaid" });
    }

    return NextResponse.json({ ok: true, sent: financeNumbers.length, count: allPending.length });
  } catch (err) {
    console.error("finance-unpaid cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
