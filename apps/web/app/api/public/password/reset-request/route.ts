import { eq, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@repo/db";
import { participants } from "@repo/db/schema/public";
import { normalizePhone } from "@/lib/whatsapp";
import { sendOtp } from "@/lib/whatsapp-otp";

const PHONE_RE = /^(?:0|62|\+62)[0-9\s\-().]{8,18}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { whatsapp?: string };
    const rawWhatsapp = body.whatsapp?.trim() ?? "";

    if (!PHONE_RE.test(rawWhatsapp)) {
      return NextResponse.json({ success: false, error: "Format nomor WhatsApp tidak valid." }, { status: 400 });
    }

    const whatsapp = normalizePhone(rawWhatsapp);
    const participant = await db.query.participants.findFirst({
      where: or(
        eq(participants.whatsapp, whatsapp),
        eq(participants.whatsapp, rawWhatsapp),
        eq(participants.phone, whatsapp),
        eq(participants.phone, rawWhatsapp)
      ),
      columns: {
        id: true,
      },
    });

    if (!participant) {
      return NextResponse.json({ success: false, error: "Nomor WhatsApp tidak ditemukan." }, { status: 404 });
    }

    const result = await sendOtp(whatsapp);
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error ?? "Gagal mengirim OTP.",
        cooldownSeconds: result.cooldownSeconds,
      }, { status: result.cooldownSeconds ? 429 : 500 });
    }

    return NextResponse.json({ success: true, expiresAt: result.expiresAt });
  } catch (error) {
    console.error("[Password Reset Request]", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
