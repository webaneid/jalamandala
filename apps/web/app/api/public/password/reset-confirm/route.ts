import { eq, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@repo/db";
import { participants } from "@repo/db/schema/public";
import { hashParticipantPassword } from "@/lib/participant-auth";
import { normalizePhone } from "@/lib/whatsapp";
import { verifyOtp } from "@/lib/whatsapp-otp";

const PHONE_RE = /^(?:0|62|\+62)[0-9\s\-().]{8,18}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      code?: string;
      otp?: string;
      password?: string;
      whatsapp?: string;
    };
    const rawWhatsapp = body.whatsapp?.trim() ?? "";
    const code = (body.code ?? body.otp)?.trim() ?? "";
    const password = body.password ?? "";

    if (!PHONE_RE.test(rawWhatsapp) || code.length !== 6) {
      return NextResponse.json({ success: false, error: "Data reset password tidak lengkap." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: "Password minimal 8 karakter." }, { status: 400 });
    }

    const whatsapp = normalizePhone(rawWhatsapp);
    const validOtp = await verifyOtp(whatsapp, code);
    if (!validOtp) {
      return NextResponse.json({ success: false, error: "Kode OTP salah atau sudah kedaluwarsa." }, { status: 401 });
    }

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
      return NextResponse.json({ success: false, error: "Akun peserta tidak ditemukan." }, { status: 404 });
    }

    const now = new Date();
    const passwordHash = await hashParticipantPassword(password);
    await db
      .update(participants)
      .set({
        passwordHash,
        passwordUpdatedAt: now,
        updatedAt: now,
      })
      .where(eq(participants.id, participant.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Password Reset Confirm]", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
