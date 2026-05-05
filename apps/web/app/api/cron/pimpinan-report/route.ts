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
    let totalTerisi = 0;
    let totalSisaUmum = 0;
    const specialTotals: Record<string, { total: number; belumDiambil: number }> = {};
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

      totalAll += total;
      totalTerisi += booked.length + reserved.length;

      // Non-special group stats
      const bookedGeneral = booked.filter((b) => !SPECIAL_GROUPS[b.groupSlug]).length;
      const reservedGeneral = reserved.filter((b) => !SPECIAL_GROUPS[b.groupSlug]).length;
      const sisaGeneral = boothsWithSlug.filter((b) => b.status === "open" && !SPECIAL_GROUPS[b.groupSlug]).length;
      totalSisaUmum += sisaGeneral;

      const lines = [`*Zona ${zone.name}* (${total} booth)`];
      if (bookedGeneral > 0) lines.push(`├ Booked: ${bookedGeneral}`);
      if (reservedGeneral > 0) lines.push(`├ Reserved: ${reservedGeneral}`);
      lines.push(`├ Sisa Umum: ${sisaGeneral}`);

      // Special groups — selalu tampil jika ada booth di zona ini
      for (const [slug, label] of Object.entries(SPECIAL_GROUPS)) {
        const groupBooths = boothsWithSlug.filter((b) => b.groupSlug === slug);
        if (groupBooths.length === 0) continue;

        const gBooked = groupBooths.filter((b) => b.status === "booked").length;
        const gReserved = groupBooths.filter((b) => b.status === "reserved").length;
        const gBelum = groupBooths.filter((b) => b.status === "open").length;

        // Akumulasi untuk total bawah
        if (!specialTotals[slug]) specialTotals[slug] = { total: 0, belumDiambil: 0 };
        specialTotals[slug]!.total += groupBooths.length;
        specialTotals[slug]!.belumDiambil += gBelum;

        const parts: string[] = [];
        if (gBooked > 0) parts.push(`${gBooked} booked`);
        if (gReserved > 0) parts.push(`${gReserved} reserved`);
        parts.push(`${gBelum} belum diambil`);
        lines.push(`├ Jatah ${label} (${groupBooths.length}): ${parts.join(", ")}`);
      }

      // Ganti ├ terakhir jadi └
      lines[lines.length - 1] = lines[lines.length - 1]!.replace("├", "└");
      zoneLines.push(lines.join("\n"));
    }

    // Total jatah khusus belum diambil
    const specialSummaryParts = Object.entries(SPECIAL_GROUPS)
      .filter(([slug]) => specialTotals[slug])
      .map(([slug, label]) => `${label} ${specialTotals[slug]!.belumDiambil}`);

    // Keuangan
    const [cashInRow, pendingRow] = await Promise.all([
      tenantDb.select({ total: sum(cashflowLedger.amount) }).from(cashflowLedger)
        .where(eq(cashflowLedger.type, "cash_in")),
      tenantDb.select({ total: sum(invoices.grandTotal) }).from(invoices)
        .where(inArray(invoices.status, ["waiting_for_payment", "waiting_confirmation", "dp_waiting_confirmation", "balance_waiting_confirmation", "balance_overdue"])),
    ]);
    const totalPaid = Number(cashInRow[0]?.total ?? 0);

    const dpPaidRows = await tenantDb.select({ sisa: sum(invoices.grandTotal) })
      .from(invoices).where(eq(invoices.status, "dp_paid"));
    const dpAmountRows = await tenantDb.select({ dp: sum(invoices.dpAmount) })
      .from(invoices).where(eq(invoices.status, "dp_paid"));
    const sisaDpPaid = Number(dpPaidRows[0]?.sisa ?? 0) - Number(dpAmountRows[0]?.dp ?? 0);
    const totalPending = Number(pendingRow[0]?.total ?? 0) + sisaDpPaid;

    const totalJatahBelum = Object.values(specialTotals).reduce((s, v) => s + v.belumDiambil, 0);

    const message = [
      `📊 *Laporan Harian FORBIS Summit*`,
      fmtDate,
      ``,
      `🏪 *Status Booth per Zona*`,
      ``,
      zoneLines.join("\n\n"),
      ``,
      `📌 *Total Keseluruhan*`,
      `├ Terisi (booked+reserved): ${totalTerisi} / ${totalAll}`,
      `├ Sisa untuk umum: ${totalSisaUmum}`,
      ...(specialSummaryParts.length > 0
        ? [`└ Jatah khusus belum diambil: ${totalJatahBelum} (${specialSummaryParts.join(", ")})`]
        : [`└ Semua jatah khusus sudah terisi`]),
      ``,
      `💰 *Keuangan*`,
      `Terbayar (inc. DP): ${fmtIDR(totalPaid)}`,
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
