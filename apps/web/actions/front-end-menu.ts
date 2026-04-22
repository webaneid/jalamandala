"use server";

import { db } from "@repo/db";
import { expoEvents, eventNavMenus, eventPages } from "@repo/db/schema/public";
import { and, asc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type FrontendRouteTarget = {
  key: string;
  sourceType: "system" | "page";
  label: string;
  pathPattern: string;
  pageType: string | null;
  pageId: string | null;
  isSelectableAsMenu: boolean;
  isSelectableAsHomepage: boolean;
};

export async function getFrontendRouteTargets(eventId: string, eventSlug: string): Promise<FrontendRouteTarget[]> {
  const targets: FrontendRouteTarget[] = [];

  // 1. System Routes
  targets.push({
    key: "homepage",
    sourceType: "system",
    label: "Beranda",
    pathPattern: `/${eventSlug}`,
    pageType: null,
    pageId: null,
    isSelectableAsMenu: true,
    isSelectableAsHomepage: false,
  });

  targets.push({
    key: "agenda",
    sourceType: "system",
    label: "Agenda",
    pathPattern: `/${eventSlug}/agenda`,
    pageType: null,
    pageId: null,
    isSelectableAsMenu: true,
    isSelectableAsHomepage: false,
  });

  targets.push({
    key: "booth",
    sourceType: "system",
    label: "Booking Booth",
    pathPattern: `/${eventSlug}/booth`,
    pageType: null,
    pageId: null,
    isSelectableAsMenu: true,
    isSelectableAsHomepage: false,
  });

  // 2. Event Pages
  const pages = await db.query.eventPages.findMany({
    where: and(
      eq(eventPages.eventId, eventId),
      eq(eventPages.status, "published"),
      isNull(eventPages.deletedAt)
    ),
  });

  for (const page of pages) {
    let pathPattern = `/${eventSlug}/halaman/${page.slug}`;
    let isSelectableAsMenu = true;
    let isSelectableAsHomepage = false;

    if (page.pageType === "landing") {
      isSelectableAsMenu = false; // Biasanya landing tidak dijadikan link menu, tapi jadi homepage
      isSelectableAsHomepage = true;
    } else if (page.pageType === "legal_tnc") {
      pathPattern = `/${eventSlug}/syarat-ketentuan`;
      isSelectableAsHomepage = false;
    } else if (page.pageType === "legal_privacy") {
      pathPattern = `/${eventSlug}/kebijakan-privasi`;
      isSelectableAsHomepage = false;
    } else {
      isSelectableAsHomepage = true;
    }

    targets.push({
      key: `page:${page.id}`,
      sourceType: "page",
      label: page.title,
      pathPattern,
      pageType: page.pageType,
      pageId: page.id,
      isSelectableAsMenu,
      isSelectableAsHomepage,
    });
  }

  return targets;
}

export async function getEventNavigationConfig(eventId: string) {
  const event = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.id, eventId),
    columns: {
      homepagePageId: true,
    },
  });

  const menus = await db.query.eventNavMenus.findMany({
    where: eq(eventNavMenus.eventId, eventId),
    orderBy: [asc(eventNavMenus.sortOrder)],
  });

  return {
    homepagePageId: event?.homepagePageId || null,
    menus,
  };
}

export async function saveEventHomepageSetting(eventId: string, homepagePageId: string | null) {
  await db.update(expoEvents)
    .set({ homepagePageId })
    .where(eq(expoEvents.id, eventId));
  revalidatePath(`/admin`);
}

export async function createEventNavMenu(payload: typeof eventNavMenus.$inferInsert) {
  await db.insert(eventNavMenus).values(payload);
  revalidatePath(`/admin`);
}

export async function updateEventNavMenu(id: string, payload: Partial<typeof eventNavMenus.$inferInsert>) {
  await db.update(eventNavMenus).set(payload).where(eq(eventNavMenus.id, id));
  revalidatePath(`/admin`);
}

export async function deleteEventNavMenu(id: string) {
  await db.delete(eventNavMenus).where(eq(eventNavMenus.id, id));
  revalidatePath(`/admin`);
}

export async function reorderEventNavMenus(items: { id: string, sortOrder: number }[]) {
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx.update(eventNavMenus)
        .set({ sortOrder: item.sortOrder })
        .where(eq(eventNavMenus.id, item.id));
    }
  });
  revalidatePath(`/admin`);
}
