import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { eq, inArray } from "drizzle-orm";

import { createTenantDb, db } from "@repo/db";
import { participants, participantBusinesses } from "@repo/db/schema/public";
import { zones as zonesSchema, booths, boothBookings, invoices } from "@repo/db/schema/tenant";
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

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session.isSuperAdmin && !session.can("finance")) {
      return NextResponse.json({ error: "Akses ditolak. Hanya super admin dan finance." }, { status: 403 });
    }

    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    // 1. All active zones (sorted for tab order)
    const allZones = await tenantDb
      .select({ id: zonesSchema.id, name: zonesSchema.name, slug: zonesSchema.slug, sortOrder: zonesSchema.sortOrder })
      .from(zonesSchema)
      .where(eq(zonesSchema.isActive, true))
      .orderBy(zonesSchema.sortOrder);

    // 2. All valid bookings joined with invoice + booth + zone in one query
    const bookingRows = await tenantDb
      .select({
        bookingId: boothBookings.id,
        businessId: boothBookings.businessId,
        participantId: boothBookings.participantId,
        boothCode: booths.code,
        zoneId: zonesSchema.id,
        zoneName: zonesSchema.name,
        invoiceStatus: invoices.status,
        invoiceGrandTotal: invoices.grandTotal,
        invoiceDpAmount: invoices.dpAmount,
        invoiceBalanceDueDate: invoices.balanceDueDate,
      })
      .from(boothBookings)
      .innerJoin(booths, eq(booths.id, boothBookings.boothId))
      .innerJoin(zonesSchema, eq(zonesSchema.id, booths.zoneId))
      .innerJoin(invoices, eq(invoices.id, boothBookings.invoiceId))
      .where(inArray(invoices.status, [...VALID_STATUSES]));

    if (bookingRows.length === 0) {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet([{ "Keterangan": "Belum ada data yang memenuhi kriteria." }]);
      XLSX.utils.book_append_sheet(wb, ws, "Semua Peserta");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="laporan-forbis.xlsx"`,
        },
      });
    }

    // 3. Fetch participants + businesses in parallel
    const participantIds = [...new Set(bookingRows.map(r => r.participantId).filter((id): id is string => !!id))];
    const businessIds = [...new Set(bookingRows.map(r => r.businessId).filter((id): id is string => !!id))];

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

    type EnrichedRow = {
      boothCode: string;
      zoneId: string;
      zoneName: string;
      participant: typeof participantRows[0] | undefined;
      business: typeof businessRows[0] | undefined;
      invoiceStatus: string;
      invoiceGrandTotal: number;
      invoiceDpAmount: number;
      invoiceBalanceDueDate: Date | null;
    };

    const enrichedRows: EnrichedRow[] = bookingRows.map(r => ({
      boothCode: r.boothCode,
      zoneId: r.zoneId,
      zoneName: r.zoneName,
      participant: r.participantId ? participantMap.get(r.participantId) : undefined,
      business: r.businessId ? businessMap.get(r.businessId) : undefined,
      invoiceStatus: r.invoiceStatus,
      invoiceGrandTotal: r.invoiceGrandTotal,
      invoiceDpAmount: r.invoiceDpAmount,
      invoiceBalanceDueDate: r.invoiceBalanceDueDate,
    }));

    // All distinct organization groups (across all valid bookings, for zone tab headers)
    const allGroups = [
      ...new Set(participantRows.map(p => p.organizationGroupName).filter((g): g is string => !!g)),
    ].sort();

    const wb = XLSX.utils.book_new();

    // ===== TAB 1: Semua Peserta =====
    const zoneOrder = new Map(allZones.map((z, i) => [z.id, i]));
    const sortedAll = [...enrichedRows].sort((a, b) => {
      const za = zoneOrder.get(a.zoneId) ?? 99;
      const zb = zoneOrder.get(b.zoneId) ?? 99;
      if (za !== zb) return za - zb;
      return naturalSort(a.boothCode, b.boothCode);
    });

    const tab1Data = sortedAll.map((row, idx) => {
      const teamL = row.business?.teamMaleCount ?? 0;
      const teamP = row.business?.teamFemaleCount ?? 0;
      return {
        "No": idx + 1,
        "Nama Peserta": row.participant?.name ?? "-",
        "Nama Usaha": row.business?.companyName ?? "-",
        "Kategori Usaha": row.business?.businessCategory ?? "-",
        "Bidang Usaha": row.business?.businessSector ?? "-",
        "Brand": row.business?.brandName ?? "-",
        "Nama di Booth": row.business?.boothName ?? "-",
        "Zona": row.zoneName,
        "Nomor Booth": row.boothCode,
        "Produk": (row.business?.productTags ?? []).join(", ") || "-",
        "Tim Laki-laki": teamL,
        "Tim Perempuan": teamP,
        "Total Tim": teamL + teamP,
      };
    });

    const ws1 = XLSX.utils.json_to_sheet(tab1Data);
    ws1["!cols"] = [
      { wch: 5 }, { wch: 28 }, { wch: 30 }, { wch: 22 }, { wch: 22 },
      { wch: 20 }, { wch: 25 }, { wch: 16 }, { wch: 12 }, { wch: 40 },
      { wch: 12 }, { wch: 14 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Semua Peserta");

    // ===== TAB per Zona =====
    for (const zone of allZones) {
      const zoneRows = enrichedRows
        .filter(r => r.zoneId === zone.id)
        .sort((a, b) => naturalSort(a.boothCode, b.boothCode));

      // Build groups map — always include all groups, even if empty in this zone
      const groupedRows = new Map<string, EnrichedRow[]>();
      for (const group of allGroups) {
        groupedRows.set(group, []);
      }

      const ungroupedKey = "Lainnya";
      for (const row of zoneRows) {
        const group = row.participant?.organizationGroupName;
        if (group && groupedRows.has(group)) {
          groupedRows.get(group)!.push(row);
        } else {
          if (!groupedRows.has(ungroupedKey)) groupedRows.set(ungroupedKey, []);
          groupedRows.get(ungroupedKey)!.push(row);
        }
      }

      type SheetRow = Record<string, string | number>;
      const sheetData: SheetRow[] = [];
      let rowNum = 0;

      for (const [groupName, rows] of groupedRows) {
        // Skip "Lainnya" if empty
        if (groupName === ungroupedKey && rows.length === 0) continue;

        // Group header row
        sheetData.push({
          "No": `=== ${groupName.toUpperCase()} ===`,
          "Nama Lengkap": "",
          "Nama Usaha": "",
          "WhatsApp": "",
          "Nomor Booth": "",
          "Status Pembayaran": "",
          "Grand Total": "",
          "Sudah Bayar": "",
          "Sisa Bayar": "",
          "Jatuh Tempo Pelunasan": "",
        });

        if (rows.length === 0) {
          sheetData.push({
            "No": "",
            "Nama Lengkap": "(tidak ada peserta di zona ini)",
            "Nama Usaha": "",
            "WhatsApp": "",
            "Nomor Booth": "",
            "Status Pembayaran": "",
            "Grand Total": "",
            "Sudah Bayar": "",
            "Sisa Bayar": "",
            "Jatuh Tempo Pelunasan": "",
          });
        } else {
          for (const row of rows) {
            rowNum++;
            const paid = calcSudahBayar(row.invoiceStatus, row.invoiceGrandTotal, row.invoiceDpAmount);
            const sisa = row.invoiceGrandTotal - paid;
            sheetData.push({
              "No": rowNum,
              "Nama Lengkap": row.participant?.name ?? "-",
              "Nama Usaha": row.business?.companyName ?? "-",
              "WhatsApp": row.participant?.whatsapp ?? "-",
              "Nomor Booth": row.boothCode,
              "Status Pembayaran": STATUS_LABELS[row.invoiceStatus] ?? row.invoiceStatus,
              "Grand Total": fmtRupiah(row.invoiceGrandTotal),
              "Sudah Bayar": fmtRupiah(paid),
              "Sisa Bayar": fmtRupiah(sisa),
              "Jatuh Tempo Pelunasan": fmtDate(row.invoiceBalanceDueDate),
            });
          }
        }
      }

      const ws = XLSX.utils.json_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 28 }, { wch: 28 }, { wch: 30 }, { wch: 18 }, { wch: 12 },
        { wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 22 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, zone.name.slice(0, 31));
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
