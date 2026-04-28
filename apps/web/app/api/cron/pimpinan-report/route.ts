import { NextRequest, NextResponse } from "next/server";
import { eq, inArray, sum } from "drizzle-orm";
import { createTenantDb, db } from "@repo/db";
import { expoEvents } from "@repo/db/schema/public";
import { booths, invoices, zones } from "@repo/db/schema/tenant";
import { sendWhatsApp } from "@/lib/whatsapp";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

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

    const leaderNumbers: string[] = (event as any)?.leaderWaNumbers ?? [];
    if (!leaderNumbers.length) {
      return NextResponse.json({ ok: true, skipped: "no leader numbers" });
    }

    const allZones = await tenantDb.query.zones.findMany({
      where: eq(zones.isActive, true),
      with: {
        booths: {
          where: eq(booths.isActive, true),
        },
      },
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
    });

    const fmtDate = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta",
    }).format(new Date());

    let totalAll = 0;
    let bookedAll = 0;
    const lines: string[] = [];

    for (const zone of allZones) {
      const total = zone.booths.length;
      const booked = zone.booths.filter((b) => b.status === "booked").length;
      const reserved = zone.booths.filter((b) => b.status === "reserved").length;
      const sisa = total - booked - reserved;
      totalAll += total;
      bookedAll += booked + reserved;
      lines.push(`${zone.name}: ${booked + reserved} terjual / ${total} total (${sisa} sisa)`);
    }

    // Keuangan
    const [paidRow, pendingRow] = await Promise.all([
      tenantDb.select({ total: sum(invoices.grandTotal) }).from(invoices).where(eq(invoices.status, "paid")),
      tenantDb.select({ total: sum(invoices.grandTotal) }).from(invoices).where(inArray(invoices.status, ["waiting_for_payment", "waiting_confirmation"])),
    ]);
    const totalPaid = Number(paidRow[0]?.total ?? 0);
    const totalPending = Number(pendingRow[0]?.total ?? 0);

    const fmtIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

    const message = [
      `📊 *Laporan Harian FORBIS Summit*`,
      fmtDate,
      ``,
      `🏪 *Status Booth*`,
      ...lines,
      ``,
      `*Total Booth: ${bookedAll} / ${totalAll} (${totalAll - bookedAll} sisa)*`,
      ``,
      `💰 *Keuangan*`,
      `Terbayar (Paid): ${fmtIDR(totalPaid)}`,
      `Pending (Belum Lunas): ${fmtIDR(totalPending)}`,
      `Total Potensi: ${fmtIDR(totalPaid + totalPending)}`,
    ].join("\n");

    for (const number of leaderNumbers) {
      await sendWhatsApp({ to: number, message, context: "pimpinan-report" });
    }

    return NextResponse.json({ ok: true, sent: leaderNumbers.length });
  } catch (err) {
    console.error("pimpinan-report cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
