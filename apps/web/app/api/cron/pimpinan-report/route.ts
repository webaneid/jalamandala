import { NextRequest, NextResponse } from "next/server";
import { eq, inArray, sum } from "drizzle-orm";
import { createTenantDb, db } from "@repo/db";
import { expoEvents } from "@repo/db/schema/public";
import { boothGroups, booths, cashflowLedger, invoices, zones } from "@repo/db/schema/tenant";
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

    const [allZones, allBoothGroups] = await Promise.all([
      tenantDb.query.zones.findMany({
        where: eq(zones.isActive, true),
        with: { booths: { where: eq(booths.isActive, true) } },
        orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
      }),
      tenantDb.select({ id: boothGroups.id, slug: boothGroups.slug }).from(boothGroups),
    ]);

    const groupSlugById = new Map(allBoothGroups.map((g) => [g.id, g.slug]));

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

      const boothsWithSlug = zone.booths.map((b) => ({
        ...b,
        groupSlug: groupSlugById.get(b.boothGroupId) ?? "",
      }));

      const booked = boothsWithSlug.filter((b) => b.status === "booked");
      const reserved = boothsWithSlug.filter((b) => b.status === "reserved");
      const sisa = boothsWithSlug.filter((b) => b.status === "open").length;

      totalAll += total;
      bookedAll += booked.length + reserved.length;

      const lines = [`*Zona ${zone.name}* (${total} booth)`];

      // Booked & Reserved untuk non-special group
      const bookedGeneral = booked.filter((b) => !SPECIAL_GROUPS[b.groupSlug]).length;
      const reservedGeneral = reserved.filter((b) => !SPECIAL_GROUPS[b.groupSlug]).length;
      const sisaGeneral = boothsWithSlug.filter((b) => b.status === "open" && !SPECIAL_GROUPS[b.groupSlug]).length;

      if (bookedGeneral > 0) lines.push(`├ Booked: ${bookedGeneral}`);
      if (reservedGeneral > 0) lines.push(`├ Reserved: ${reservedGeneral}`);
      if (sisaGeneral > 0) lines.push(`├ Sisa: ${sisaGeneral}`);

      // Special groups — selalu tampil jika ada booth di zona ini
      for (const [slug, label] of Object.entries(SPECIAL_GROUPS)) {
        const groupBooths = boothsWithSlug.filter((b) => b.groupSlug === slug);
        if (groupBooths.length === 0) continue;
        const gBooked = groupBooths.filter((b) => b.status === "booked").length;
        const gReserved = groupBooths.filter((b) => b.status === "reserved").length;
        const gSisa = groupBooths.filter((b) => b.status === "open").length;
        const parts: string[] = [];
        if (gBooked > 0) parts.push(`${gBooked} booked`);
        if (gReserved > 0) parts.push(`${gReserved} reserved`);
        if (gSisa > 0) parts.push(`${gSisa} sisa`);
        lines.push(`├ ${label} (${groupBooths.length}): ${parts.join(", ")}`);
      }

      // Ganti ├ terakhir jadi └
      if (lines.length > 1) {
        lines[lines.length - 1] = lines[lines.length - 1]!.replace("├", "└");
      }

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
