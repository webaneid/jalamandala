import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { eq, inArray, sql } from "drizzle-orm";

import { createTenantDb, db } from "@repo/db";
import { participants, participantBusinesses } from "@repo/db/schema/public";
import { zones as zonesSchema, booths, boothGroups, boothBookings, invoices } from "@repo/db/schema/tenant";
import { getAdminSession } from "@/lib/admin-auth";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

const VALID_STATUSES = [
  "waiting_for_payment",
  "waiting_confirmation",
  "dp_waiting_confirmation",
  "dp_paid",
  "balance_waiting_confirmation",
  "balance_overdue",
  "paid",
] as const;

const STATUS_LABELS: Record<string, string> = {
  waiting_for_payment: "Belum Bayar",
  waiting_confirmation: "Menunggu Verifikasi",
  dp_waiting_confirmation: "DP - Menunggu Verifikasi",
  dp_paid: "DP Diterima",
  balance_waiting_confirmation: "Pelunasan - Menunggu Verifikasi",
  balance_overdue: "Pelunasan Jatuh Tempo",
  paid: "Lunas",
};

function calcSudahBayar(status: string, grandTotal: number, dpAmount: number): number {
  if (status === "paid") return grandTotal;
  if (["dp_paid", "balance_waiting_confirmation", "balance_overdue"].includes(status)) return dpAmount;
  return 0;
}

function fmtRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));
}

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

// Kelompok label: dari booth group, kecuali "general" → pakai org peserta
function resolveKelompok(boothGroupSlug: string | null, boothGroupName: string | null, orgGroupName: string | null | undefined): string {
  if (!boothGroupSlug || boothGroupSlug === "general") {
    return orgGroupName ?? "Umum";
  }
  return boothGroupName ?? boothGroupSlug;
}

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session.isSuperAdmin && !session.can("finance")) {
      return NextResponse.json({ error: "Akses ditolak. Hanya super admin dan finance." }, { status: 403 });
    }

    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    // 1. ALL active booths with zone + group info (untuk zona tabs termasuk yang kosong)
    const allBooths = await tenantDb
      .select({
        boothId: booths.id,
        boothCode: booths.code,
        boothGroupSlug: boothGroups.slug,
        boothGroupName: boothGroups.name,
        zoneId: zonesSchema.id,
        zoneName: zonesSchema.name,
        zoneSortOrder: zonesSchema.sortOrder,
      })
      .from(booths)
      .innerJoin(zonesSchema, eq(zonesSchema.id, booths.zoneId))
      .leftJoin(boothGroups, eq(boothGroups.id, booths.boothGroupId))
      .where(eq(zonesSchema.isActive, true))
      .orderBy(zonesSchema.sortOrder);

    // 2. Active bookings with valid invoice status
    const activeBookings = await tenantDb
      .select({
        boothId: boothBookings.boothId,
        businessId: boothBookings.businessId,
        participantId: boothBookings.participantId,
        invoiceStatus: invoices.status,
        invoiceGrandTotal: invoices.grandTotal,
        invoiceDpAmount: invoices.dpAmount,
        invoiceBalanceDueDate: invoices.balanceDueDate,
      })
      .from(boothBookings)
      .innerJoin(invoices, sql`${invoices.id} = ${boothBookings.invoiceId}::uuid`)
      .where(inArray(invoices.status, [...VALID_STATUSES]));

    // Map: boothId → booking
    const bookingByBooth = new Map(activeBookings.map(b => [b.boothId, b]));

    // 3. Fetch participants + businesses for active bookings only
    const participantIds = [...new Set(activeBookings.map(b => b.participantId).filter((id): id is string => !!id))];
    const businessIds = [...new Set(activeBookings.map(b => b.businessId).filter((id): id is string => !!id))];

    const [participantRows, businessRows] = await Promise.all([
      participantIds.length > 0
        ? db.select({
            id: participants.id,
            name: participants.name,
            whatsapp: participants.whatsapp,
            organizationGroupName: participants.organizationGroupName,
          }).from(participants).where(inArray(participants.id, participantIds))
        : Promise.resolve([]),
      businessIds.length > 0
        ? db.select({
            id: participantBusinesses.id,
            companyName: participantBusinesses.companyName,
            boothName: participantBusinesses.boothName,
            brandName: participantBusinesses.brandName,
            businessCategory: participantBusinesses.businessCategory,
            businessSector: participantBusinesses.businessSector,
            productTags: participantBusinesses.productTags,
            teamMaleCount: participantBusinesses.teamMaleCount,
            teamFemaleCount: participantBusinesses.teamFemaleCount,
          }).from(participantBusinesses).where(inArray(participantBusinesses.id, businessIds))
        : Promise.resolve([]),
    ]);

    const participantMap = new Map(participantRows.map(p => [p.id, p]));
    const businessMap = new Map(businessRows.map(b => [b.id, b]));

    // All active zones sorted
    const zoneOrder = new Map<string, number>();
    const zoneMeta = new Map<string, { name: string; sortOrder: number }>();
    for (const booth of allBooths) {
      if (!zoneOrder.has(booth.zoneId)) {
        zoneOrder.set(booth.zoneId, booth.zoneSortOrder);
        zoneMeta.set(booth.zoneId, { name: booth.zoneName, sortOrder: booth.zoneSortOrder });
      }
    }
    const sortedZoneIds = [...zoneMeta.entries()]
      .sort((a, b) => a[1].sortOrder - b[1].sortOrder)
      .map(([id]) => id);

    const wb = XLSX.utils.book_new();

    // ===== TAB 1: Semua Peserta (hanya yang ada booking valid) =====
    const bookedBooths = allBooths
      .filter(b => bookingByBooth.has(b.boothId))
      .sort((a, b) => {
        const za = zoneOrder.get(a.zoneId) ?? 99;
        const zb = zoneOrder.get(b.zoneId) ?? 99;
        if (za !== zb) return za - zb;
        return naturalSort(a.boothCode, b.boothCode);
      });

    const tab1Data = bookedBooths.map((booth, idx) => {
      const booking = bookingByBooth.get(booth.boothId)!;
      const participant = booking.participantId ? participantMap.get(booking.participantId) : undefined;
      const business = booking.businessId ? businessMap.get(booking.businessId) : undefined;
      const teamL = business?.teamMaleCount ?? 0;
      const teamP = business?.teamFemaleCount ?? 0;
      return {
        "No": idx + 1,
        "Nama Peserta": participant?.name ?? "-",
        "Nama Usaha": business?.companyName ?? "-",
        "Kategori Usaha": business?.businessCategory ?? "-",
        "Bidang Usaha": business?.businessSector ?? "-",
        "Brand": business?.brandName ?? "-",
        "Nama di Booth": business?.boothName ?? "-",
        "Zona": booth.zoneName,
        "Nomor Booth": booth.boothCode,
        "Produk": (business?.productTags ?? []).join(", ") || "-",
        "Tim Laki-laki": teamL,
        "Tim Perempuan": teamP,
        "Total Tim": teamL + teamP,
      };
    });

    const ws1 = XLSX.utils.json_to_sheet(tab1Data.length > 0 ? tab1Data : [{ "Keterangan": "Belum ada data." }]);
    ws1["!cols"] = [
      { wch: 5 }, { wch: 28 }, { wch: 30 }, { wch: 22 }, { wch: 22 },
      { wch: 20 }, { wch: 25 }, { wch: 16 }, { wch: 12 }, { wch: 40 },
      { wch: 12 }, { wch: 14 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Semua Peserta");

    // ===== TAB per Zona (SEMUA booth, termasuk kosong) =====
    for (const zoneId of sortedZoneIds) {
      const meta = zoneMeta.get(zoneId)!;

      const zoneBooths = allBooths
        .filter(b => b.zoneId === zoneId)
        .sort((a, b) => naturalSort(a.boothCode, b.boothCode));

      type SheetRow = Record<string, string | number>;
      const sheetData: SheetRow[] = zoneBooths.map((booth, idx) => {
        const booking = bookingByBooth.get(booth.boothId);
        const participant = booking?.participantId ? participantMap.get(booking.participantId) : undefined;
        const business = booking?.businessId ? businessMap.get(booking.businessId) : undefined;

        const kelompok = resolveKelompok(
          booth.boothGroupSlug,
          booth.boothGroupName,
          participant?.organizationGroupName,
        );

        if (!booking) {
          // Booth kosong — tetap tampil dengan info booth group
          return {
            "No": idx + 1,
            "Nomor Booth": booth.boothCode,
            "Kelompok": kelompok,
            "Nama Lengkap": "",
            "Nama Usaha": "",
            "WhatsApp": "",
            "Status Pembayaran": "Kosong",
            "Grand Total": "",
            "Sudah Bayar": "",
            "Sisa Bayar": "",
            "Jatuh Tempo Pelunasan": "",
          };
        }

        const paid = calcSudahBayar(booking.invoiceStatus, booking.invoiceGrandTotal, booking.invoiceDpAmount);
        const sisa = booking.invoiceGrandTotal - paid;
        return {
          "No": idx + 1,
          "Nomor Booth": booth.boothCode,
          "Kelompok": kelompok,
          "Nama Lengkap": participant?.name ?? "-",
          "Nama Usaha": business?.companyName ?? "-",
          "WhatsApp": participant?.whatsapp ?? "-",
          "Status Pembayaran": STATUS_LABELS[booking.invoiceStatus] ?? booking.invoiceStatus,
          "Grand Total": fmtRupiah(booking.invoiceGrandTotal),
          "Sudah Bayar": fmtRupiah(paid),
          "Sisa Bayar": fmtRupiah(sisa),
          "Jatuh Tempo Pelunasan": fmtDate(booking.invoiceBalanceDueDate),
        };
      });

      const ws = XLSX.utils.json_to_sheet(sheetData.length > 0 ? sheetData : [{ "Keterangan": "Belum ada data." }]);
      ws["!cols"] = [
        { wch: 5 }, { wch: 12 }, { wch: 18 }, { wch: 28 }, { wch: 30 },
        { wch: 18 }, { wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 22 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, meta.name.slice(0, 31));
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-forbis-${stamp}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("[export-komprehensif]", err);
    return NextResponse.json({ error: "Gagal mengekspor data." }, { status: 500 });
  }
}
