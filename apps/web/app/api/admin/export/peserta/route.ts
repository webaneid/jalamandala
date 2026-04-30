import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { and, eq, inArray } from "drizzle-orm";

import { createTenantDb, db } from "@repo/db";
import { participants, participantBusinesses } from "@repo/db/schema/public";
import { booths, boothBookings } from "@repo/db/schema/tenant";
import { getAdminSession } from "@/lib/admin-auth";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

export async function GET() {
  try {
    await getAdminSession();
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    // 1. Semua peserta + bisnis mereka
    const allParticipants = await db
      .select({
        participantId: participants.id,
        name: participants.name,
        whatsapp: participants.whatsapp,
        businessId: participantBusinesses.id,
        companyName: participantBusinesses.companyName,
        boothName: participantBusinesses.boothName,
        brandName: participantBusinesses.brandName,
      })
      .from(participants)
      .leftJoin(participantBusinesses, eq(participantBusinesses.participantId, participants.id));

    // 2. Semua booking (reserved + booked) + kode booth
    const bookingRows = await tenantDb
      .select({
        businessId: boothBookings.businessId,
        bookingStatus: boothBookings.bookingStatus,
        boothCode: booths.code,
      })
      .from(boothBookings)
      .innerJoin(booths, eq(booths.id, boothBookings.boothId))
      .where(inArray(boothBookings.bookingStatus, ["reserved", "booked"]));

    // businessId → [{ boothCode, bookingStatus }]
    const bookingMap = new Map<string, { boothCode: string; bookingStatus: string }[]>();
    for (const row of bookingRows) {
      if (!row.businessId) continue;
      if (!bookingMap.has(row.businessId)) bookingMap.set(row.businessId, []);
      bookingMap.get(row.businessId)!.push({ boothCode: row.boothCode, bookingStatus: row.bookingStatus });
    }

    // 3. Susun baris Excel — satu baris per booking
    // Peserta tanpa booking tetap masuk (satu baris, booth kosong)
    const rows: Record<string, string>[] = [];

    for (const p of allParticipants) {
      const bookings = p.businessId ? (bookingMap.get(p.businessId) ?? []) : [];

      if (bookings.length === 0) {
        rows.push({
          "Nama Lengkap": p.name,
          "Nomor WhatsApp": p.whatsapp,
          "Nama Perusahaan": p.companyName ?? "-",
          "Nama di Booth": p.boothName || p.brandName || "-",
          "Nomor Booth": "-",
          "Status Booking": "-",
        });
      } else {
        for (const booking of bookings) {
          rows.push({
            "Nama Lengkap": p.name,
            "Nomor WhatsApp": p.whatsapp,
            "Nama Perusahaan": p.companyName ?? "-",
            "Nama di Booth": p.boothName || p.brandName || "-",
            "Nomor Booth": booking.boothCode,
            "Status Booking": booking.bookingStatus === "booked" ? "Booked" : "Reserved",
          });
        }
      }
    }

    const ws = XLSX.utils.json_to_sheet(rows);

    // Lebar kolom
    ws["!cols"] = [
      { wch: 30 },
      { wch: 18 },
      { wch: 35 },
      { wch: 30 },
      { wch: 14 },
      { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Peserta");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `peserta-forbis-${stamp}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("export peserta error:", err);
    return NextResponse.json({ error: "Gagal mengekspor data." }, { status: 500 });
  }
}
