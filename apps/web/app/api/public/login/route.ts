import { eq, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@repo/db";
import { participants } from "@repo/db/schema/public";
import { verifyParticipantPassword } from "@/lib/participant-auth";
import {
  createParticipantSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/participant-session";
import { normalizePhone } from "@/lib/whatsapp";

function normalizeIdentifier(value?: string | null) {
  return value?.trim() ?? "";
}

function looksLikePhone(value: string) {
  return /^(?:0|62|\+62)[0-9\s\-().]{8,18}$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      eventSlug?: string;
      identifier?: string;
      password?: string;
    };

    const eventSlug = normalizeIdentifier(body.eventSlug);
    const identifier = normalizeIdentifier(body.identifier);
    const password = body.password ?? "";

    if (!eventSlug || !identifier || !password) {
      return NextResponse.json({ success: false, error: "Email/WhatsApp dan password wajib diisi." }, { status: 400 });
    }

    const normalizedEmail = identifier.toLowerCase();
    const normalizedPhone = looksLikePhone(identifier) ? normalizePhone(identifier) : identifier;
    const participant = await db.query.participants.findFirst({
      where: or(
        eq(participants.email, normalizedEmail),
        eq(participants.whatsapp, normalizedPhone),
        eq(participants.whatsapp, identifier),
        eq(participants.phone, normalizedPhone),
        eq(participants.phone, identifier)
      ),
      columns: {
        id: true,
        name: true,
        passwordHash: true,
        whatsapp: true,
        whatsappVerifiedAt: true,
      },
    });

    if (!participant?.passwordHash) {
      return NextResponse.json({ success: false, error: "Email/WhatsApp atau password salah." }, { status: 401 });
    }

    const validPassword = await verifyParticipantPassword(password, participant.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ success: false, error: "Email/WhatsApp atau password salah." }, { status: 401 });
    }

    if (!participant.whatsappVerifiedAt) {
      return NextResponse.json({
        success: false,
        error: "Nomor WhatsApp belum diverifikasi. Silakan verifikasi OTP terlebih dahulu.",
        requiresOtp: true,
        whatsapp: participant.whatsapp,
      }, { status: 403 });
    }

    const sessionId = await createParticipantSession({
      eventSlug,
      name: participant.name,
      participantId: participant.id,
      phone: participant.whatsapp,
    });

    const response = NextResponse.json({
      success: true,
      redirectTo: `/${eventSlug}/dashboard`,
    });
    response.cookies.set(SESSION_COOKIE, sessionId, SESSION_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    console.error("[Public Login]", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
