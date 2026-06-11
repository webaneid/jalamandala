"use server";

import { and, asc, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@repo/db";
import { eventAgendas } from "@repo/db/schema/public";

export type AgendaPayload = {
  title: string;
  description: string;
  agendaType: string;
  startAt: string;
  endAt: string;
  venueName: string;
  stageName: string;
  speakerNames: string[];
  isPublic: boolean;
  status: string;
  sortOrder: number;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSpeakerNames(names: string[]) {
  return names
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name, index, all) => all.indexOf(name) === index);
}

function parseOptionalDateTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // datetime-local input gives "YYYY-MM-DDTHH:MM" or "YYYY-MM-DDTHH:MM:SS" without
  // timezone. Admin users are always in WIB (UTC+7), so we append +07:00 to avoid
  // the server treating it as UTC and introducing a 7-hour offset.
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2})?$/);
  if (match) {
    const parsed = new Date(`${match[1]}${match[2] ?? ":00"}+07:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function createUniqueSlug(eventId: string, title: string, excludeId?: string) {
  const baseSlug = slugify(title) || "agenda";
  const rows = await db
    .select({ id: eventAgendas.id, slug: eventAgendas.slug })
    .from(eventAgendas)
    .where(
      excludeId
        ? and(eq(eventAgendas.eventId, eventId), ne(eventAgendas.id, excludeId))
        : eq(eventAgendas.eventId, eventId)
    )
    .orderBy(asc(eventAgendas.slug));

  const usedSlugs = new Set(rows.map((row) => row.slug));
  if (!usedSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  while (usedSlugs.has(`${baseSlug}-${counter}`)) {
    counter += 1;
  }

  return `${baseSlug}-${counter}`;
}

function validatePayload(payload: AgendaPayload) {
  if (!payload.title.trim()) {
    return "Judul agenda wajib diisi.";
  }

  const startAt = parseOptionalDateTime(payload.startAt);
  if (!startAt) {
    return "Waktu mulai agenda wajib valid.";
  }

  const endAt = parseOptionalDateTime(payload.endAt);
  if (payload.endAt.trim() && !endAt) {
    return "Waktu selesai agenda tidak valid.";
  }

  if (endAt && endAt < startAt) {
    return "Waktu selesai tidak boleh lebih awal dari waktu mulai.";
  }

  if (!["ceremony", "talkshow", "workshop", "business_matching", "entertainment", "session"].includes(payload.agendaType)) {
    return "Tipe agenda tidak valid.";
  }

  if (!["draft", "published", "cancelled"].includes(payload.status)) {
    return "Status agenda tidak valid.";
  }

  return null;
}

export async function createAgenda(eventId: string, payload: AgendaPayload) {
  const validationError = validatePayload(payload);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const startAt = parseOptionalDateTime(payload.startAt)!;
    const endAt = parseOptionalDateTime(payload.endAt);
    const slug = await createUniqueSlug(eventId, payload.title);

    await db.insert(eventAgendas).values({
      agendaType: payload.agendaType,
      description: payload.description.trim() || null,
      endAt,
      eventId,
      isPublic: payload.isPublic,
      slug,
      sortOrder: Number.isFinite(payload.sortOrder) ? payload.sortOrder : 0,
      speakerNames: normalizeSpeakerNames(payload.speakerNames),
      stageName: payload.stageName.trim() || null,
      startAt,
      status: payload.status,
      title: payload.title.trim(),
      updatedAt: new Date(),
      venueName: payload.venueName.trim() || null,
    });

    revalidatePath("/admin/agenda");
    return { success: true };
  } catch (error) {
    console.error("createAgenda failed:", error);
    return { success: false, error: "Gagal menambah agenda." };
  }
}

export async function updateAgenda(agendaId: string, eventId: string, payload: AgendaPayload) {
  const validationError = validatePayload(payload);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const startAt = parseOptionalDateTime(payload.startAt)!;
    const endAt = parseOptionalDateTime(payload.endAt);
    const slug = await createUniqueSlug(eventId, payload.title, agendaId);

    await db
      .update(eventAgendas)
      .set({
        agendaType: payload.agendaType,
        description: payload.description.trim() || null,
        endAt,
        isPublic: payload.isPublic,
        slug,
        sortOrder: Number.isFinite(payload.sortOrder) ? payload.sortOrder : 0,
        speakerNames: normalizeSpeakerNames(payload.speakerNames),
        stageName: payload.stageName.trim() || null,
        startAt,
        status: payload.status,
        title: payload.title.trim(),
        updatedAt: new Date(),
        venueName: payload.venueName.trim() || null,
      })
      .where(and(eq(eventAgendas.id, agendaId), eq(eventAgendas.eventId, eventId)));

    revalidatePath("/admin/agenda");
    return { success: true };
  } catch (error) {
    console.error("updateAgenda failed:", error);
    return { success: false, error: "Gagal memperbarui agenda." };
  }
}
