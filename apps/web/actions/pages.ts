"use server";

import { db } from "@repo/db";
import { eventPages, mediaUsages } from "@repo/db/schema/public";
import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function listEventPages(eventId: string) {
  const rows = await db.query.eventPages.findMany({
    where: and(
      eq(eventPages.eventId, eventId),
      isNull(eventPages.deletedAt)
    ),
    orderBy: [desc(eventPages.updatedAt)],
  });
  return rows;
}

export async function getEventPageDetail(id: string) {
  const page = await db.query.eventPages.findFirst({
    where: and(
      eq(eventPages.id, id),
      isNull(eventPages.deletedAt)
    ),
    with: {
      featuredImage: true,
      event: true,
    },
  });
  return page;
}

export async function upsertEventPage(payload: {
  id?: string;
  eventId: string;
  title: string;
  slug: string;
  pageType: "default" | "landing" | "legal_tnc" | "legal_privacy";
  status: "draft" | "published" | "archived";
  excerpt?: string | null;
  contentFormat: "tiptap_json" | "page_blocks";
  content?: any;
  featuredImageAssetId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}) {
  const isNew = !payload.id;

  // Singleton Check
  if (
    payload.pageType === "landing" ||
    payload.pageType === "legal_tnc" ||
    payload.pageType === "legal_privacy"
  ) {
    const existing = await db.query.eventPages.findFirst({
      where: and(
        eq(eventPages.eventId, payload.eventId),
        eq(eventPages.pageType, payload.pageType),
        isNull(eventPages.deletedAt)
      ),
    });

    if (existing && existing.id !== payload.id) {
      throw new Error(`Halaman ${payload.pageType} sudah ada untuk event ini.`);
    }
  }

  let finalSlug = payload.slug;
  if (payload.pageType === "legal_tnc") finalSlug = "syarat-ketentuan";
  if (payload.pageType === "legal_privacy") finalSlug = "kebijakan-privasi";

  const data = {
    eventId: payload.eventId,
    title: payload.title,
    slug: finalSlug,
    pageType: payload.pageType,
    status: payload.status,
    excerpt: payload.excerpt,
    contentFormat: payload.contentFormat,
    content: payload.content,
    featuredImageAssetId: payload.featuredImageAssetId,
    seoTitle: payload.seoTitle,
    seoDescription: payload.seoDescription,
    updatedAt: new Date(),
    ...(payload.status === "published" ? { publishedAt: new Date() } : {}),
  };

  let pageId = payload.id;

  if (isNew) {
    const [inserted] = await db.insert(eventPages).values(data).returning({ id: eventPages.id });
    pageId = inserted!.id;
  } else {
    await db.update(eventPages).set(data).where(eq(eventPages.id, pageId!));
  }

  if (payload.featuredImageAssetId) {
    // Check if usage exists
    const usage = await db.query.mediaUsages.findFirst({
      where: and(
        eq(mediaUsages.entityId, pageId!),
        eq(mediaUsages.entityType, "event_page"),
        eq(mediaUsages.fieldName, "featured_image")
      )
    });

    if (!usage) {
       await db.insert(mediaUsages).values({
         assetId: payload.featuredImageAssetId,
         module: "page",
         entityType: "event_page",
         entityId: pageId!,
         fieldName: "featured_image"
       });
    } else if (usage.assetId !== payload.featuredImageAssetId) {
       await db.update(mediaUsages)
         .set({ assetId: payload.featuredImageAssetId })
         .where(eq(mediaUsages.id, usage.id));
    }
  }

  revalidatePath(`/admin/laman`);
  return { success: true, id: pageId };
}

export async function deleteEventPage(id: string) {
  await db.update(eventPages)
    .set({ 
      deletedAt: new Date(),
      status: "archived"
    })
    .where(eq(eventPages.id, id));

  // remove media usage
  await db.delete(mediaUsages)
    .where(and(
      eq(mediaUsages.entityId, id),
      eq(mediaUsages.entityType, "event_page"),
      eq(mediaUsages.fieldName, "featured_image")
    ));

  revalidatePath(`/admin/laman`);
  return { success: true };
}
