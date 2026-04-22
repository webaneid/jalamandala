import { and, eq, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db, createTenantDb } from "@repo/db";
import { boothGroups } from "@repo/db/schema/tenant";
import { forbisMembers, participants } from "@repo/db/schema/public";
import { hashParticipantPassword } from "@/lib/participant-auth";
import { normalizePhone } from "@/lib/whatsapp";
import { sendOtp } from "@/lib/whatsapp-otp";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";
const PHONE_RE = /^(?:0|62|\+62)[0-9]{8,13}$/;

function normalizeEmail(value?: string | null) {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return trimmed || null;
}

function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      email?: string;
      forbisMemberId?: string;
      forbisMemberSourceId?: string;
      isKmiAlumni?: boolean;
      kmiYear?: string;
      name?: string;
      organizationGroupId?: string;
      password?: string;
      phone?: string;
      whatsapp?: string;
    };

    const name = normalizeText(body.name);
    const email = normalizeEmail(body.email);
    const rawPhone = normalizeText(body.phone);
    const rawWhatsapp = normalizeText(body.whatsapp || body.phone);
    const password = body.password ?? "";
    const organizationGroupId = normalizeText(body.organizationGroupId);
    const forbisMemberId = normalizeText(body.forbisMemberId) || null;
    const forbisMemberSourceId = normalizeText(body.forbisMemberSourceId) || null;

    if (!organizationGroupId) {
      return NextResponse.json({ success: false, error: "Pilih organisasi terlebih dahulu." }, { status: 400 });
    }
    if (name.length < 2) {
      return NextResponse.json({ success: false, error: "Nama lengkap wajib diisi." }, { status: 400 });
    }
    if (!PHONE_RE.test(rawPhone.replace(/\s/g, "")) || !PHONE_RE.test(rawWhatsapp.replace(/\s/g, ""))) {
      return NextResponse.json({ success: false, error: "Format nomor telepon/WhatsApp tidak valid." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: "Password minimal 8 karakter." }, { status: 400 });
    }

    const phone = normalizePhone(rawPhone);
    const whatsapp = normalizePhone(rawWhatsapp);
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const organizationGroup = await tenantDb.query.boothGroups.findFirst({
      where: eq(boothGroups.id, organizationGroupId),
    });

    if (!organizationGroup) {
      return NextResponse.json({ success: false, error: "Organisasi tidak ditemukan." }, { status: 400 });
    }

    let forbisMember:
      | {
          forbisMemberId: string | null;
          id: string;
          name: string;
        }
      | null = null;

    if (organizationGroup.slug === "forbis") {
      if (!forbisMemberSourceId && !forbisMemberId) {
        return NextResponse.json({ success: false, error: "Pilih nama anggota FORBIS dari data anggota." }, { status: 400 });
      }

      forbisMember = await db.query.forbisMembers.findFirst({
        where: forbisMemberSourceId
          ? and(eq(forbisMembers.id, forbisMemberSourceId), eq(forbisMembers.isActive, true))
          : and(eq(forbisMembers.forbisMemberId, forbisMemberId!), eq(forbisMembers.isActive, true)),
        columns: {
          forbisMemberId: true,
          id: true,
          name: true,
        },
      }) ?? null;

      if (!forbisMember) {
        return NextResponse.json({ success: false, error: "Data anggota FORBIS tidak ditemukan." }, { status: 400 });
      }

      const existingForbisRegistration = await db.query.participants.findFirst({
        where: forbisMember.forbisMemberId
          ? and(
              eq(participants.organizationGroupSlug, "forbis"),
              eq(participants.forbisMemberId, forbisMember.forbisMemberId)
            )
          : and(
              eq(participants.organizationGroupSlug, "forbis"),
              eq(participants.name, forbisMember.name)
            ),
        columns: { id: true },
      });

      if (existingForbisRegistration) {
        return NextResponse.json({
          success: false,
          error: "Anggota FORBIS ini sudah terdaftar. Silakan login atau hubungi panitia.",
        }, { status: 409 });
      }
    }

    const duplicate = await db.query.participants.findFirst({
      where: email
        ? or(eq(participants.email, email), eq(participants.phone, phone), eq(participants.whatsapp, whatsapp))
        : or(eq(participants.phone, phone), eq(participants.whatsapp, whatsapp)),
      columns: { email: true, name: true, phone: true, whatsapp: true },
    });

    if (duplicate) {
      return NextResponse.json({
        success: false,
        error: "Email, nomor telepon, atau WhatsApp sudah terdaftar. Silakan login.",
      }, { status: 409 });
    }

    const now = new Date();
    const passwordHash = await hashParticipantPassword(password);

    const [participant] = await db.insert(participants).values({
      email,
      isForbisMember: organizationGroup.slug === "forbis",
      forbisMemberId: organizationGroup.slug === "forbis" ? forbisMember?.forbisMemberId ?? null : null,
      isKmiAlumni: Boolean(body.isKmiAlumni),
      kmiYear: Boolean(body.isKmiAlumni) ? (body.kmiYear?.trim().slice(0, 4) || null) : null,
      name,
      organizationGroupId: organizationGroup.id,
      organizationGroupName: organizationGroup.name,
      organizationGroupSlug: organizationGroup.slug,
      passwordHash,
      passwordUpdatedAt: now,
      phone,
      whatsapp,
      updatedAt: now,
    }).returning({
      id: participants.id,
      whatsapp: participants.whatsapp,
    });

    if (!participant) {
      return NextResponse.json({ success: false, error: "Gagal membuat akun peserta." }, { status: 500 });
    }

    const otp = await sendOtp(participant.whatsapp);
    if (!otp.success) {
      return NextResponse.json({
        success: false,
        error: otp.error ?? "Akun dibuat, tetapi OTP gagal dikirim. Coba kirim ulang OTP dari halaman verifikasi.",
        participantId: participant.id,
        requiresOtp: true,
      }, { status: 202 });
    }

    return NextResponse.json({
      success: true,
      participantId: participant.id,
      requiresOtp: true,
    });
  } catch (error) {
    console.error("[Public Register]", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
