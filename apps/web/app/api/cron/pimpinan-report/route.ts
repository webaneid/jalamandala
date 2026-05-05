import { NextRequest, NextResponse } from "next/server";
import { eq, inArray, sum } from "drizzle-orm";
import { createTenantDb, db } from "@repo/db";
import { expoEvents } from "@repo/db/schema/public";
import { booths, cashflowLedger, invoices, zones } from "@repo/db/schema/tenant";
import { sendWhatsApp } from "@/lib/whatsapp";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

const SPECIAL_GROUPS: Record<string, string> = {
  fpag: "FPAG",
  formaqin: "FORMAQIN",
  gontor: "Internal Gontor",
};

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
          with: { boothGroup: { columns: { slug: true, name: true } } },
        },
      },
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
    });

    const fmtDate = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta",
    }).format(new Date());

    const fmtIDR = (n: number) =>
      new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

    let totalAll = 0;
    let bookedAll = 0;
    const zoneLines: string[] = [];

    for (const zone of allZones) {
      const total = zone.booths.length;
      if (total === 0) continue;

      const booked = zone.booths.filter((b) => b.status === "booked");
      const reserved = zone.booths.filter((b) => b.status === "reserved");
      const sisa = zone.booths.filter((b) => b.status === "open").length;

      totalAll += total;
      bookedAll += booked.length + reserved.length;

      const lines = [`*Zona ${zone.name}* (${total} booth)`];

      // Booked — general dulu, lalu per special group
      const bookedGeneral = booked.filter((b) => !SPECIAL_GROUPS[b.boothGroup?.slug ?? ""]).length;
      if (bookedGeneral > 0) lines.push(`├ Booked: ${bookedGeneral}`);
      for (const [slug, label] of Object.entries(SPECIAL_GROUPS)) {
        const count = booked.filter((b) => b.boothGroup?.slug === slug).length;
        if (count > 0) lines.push(`├ Booked ${label}: ${count}`);
      }

      // Reserved — general dulu, lalu per special group
      const reservedGeneral = reserved.filter((b) => !SPECIAL_GROUPS[b.boothGroup?.slug ?? ""]).length;
      if (reservedGeneral > 0) lines.push(`├ Reserved: ${reservedGeneral}`);
      for (const [slug, label] of Object.entries(SPECIAL_GROUPS)) {
        const count = reserved.filter((b) => b.boothGroup?.slug === slug).length;
        if (count > 0) lines.push(`├ Reserved ${label}: ${count}`);
      }

      lines.push(`└ Sisa: ${sisa}`);
      zoneLines.push(lines.join("\n"));
    }

    // Keuangan — pakai cashflow ledger agar sesuai uang yang benar-benar masuk (termasuk DP)
    const [cashInRow, pendingRow] = await Promise.all([
      tenantDb.select({ total: sum(cashflowLedger.amount) }).from(cashflowLedger)
        .where(eq(cashflowLedger.type, "cash_in")),
      tenantDb.select({ total: sum(invoices.grandTotal) }).from(invoices)
        .where(inArray(invoices.status, ["waiting_for_payment", "waiting_confirmation", "dp_waiting_confirmation", "balance_waiting_confirmation", "balance_overdue"])),
    ]);
    const totalPaid = Number(cashInRow[0]?.total ?? 0);

    // Untuk pending: grandTotal dikurangi dpAmount yang sudah masuk
    const dpPaidRows = await tenantDb.select({ sisa: sum(invoices.grandTotal) })
      .from(invoices).where(eq(invoices.status, "dp_paid"));
    const dpPaidGrandTotal = Number(dpPaidRows[0]?.sisa ?? 0);
    const dpAmountRows = await tenantDb.select({ dp: sum(invoices.dpAmount) })
      .from(invoices).where(eq(invoices.status, "dp_paid"));
    const dpAmountPaid = Number(dpAmountRows[0]?.dp ?? 0);
    const sisaDpPaid = dpPaidGrandTotal - dpAmountPaid;

    const totalPending = Number(pendingRow[0]?.total ?? 0) + sisaDpPaid;

    const message = [
      `📊 *Laporan Harian FORBIS Summit*`,
      fmtDate,
      ``,
      `🏪 *Status Booth per Zona*`,
      ``,
      zoneLines.join("\n\n"),
      ``,
      `*Total: ${bookedAll} terisi / ${totalAll} total (${totalAll - bookedAll} sisa)*`,
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
