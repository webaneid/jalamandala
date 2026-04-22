"use server";

import { randomUUID } from "node:crypto";
import { randomBytes, scrypt } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendWhatsApp } from "@/lib/whatsapp";
import { renderWaTemplate, WA_KEYS } from "@/lib/whatsapp-template";

import { db, createTenantDb } from "@repo/db";
import {
  user,
  account,
  userRoles,
  vendors,
  vendorBoothAssignments,
  vendorAddonAssignments,
} from "@repo/db/schema/public";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, key) => {
        if (err) reject(err);
        else resolve(`${salt}:${(key as Buffer).toString("hex")}`);
      }
    );
  });
}

export async function getVendors(eventId: string) {
  const rows = await db
    .select()
    .from(vendors)
    .where(eq(vendors.eventId, eventId))
    .orderBy(vendors.createdAt);

  if (rows.length === 0) return [];

  const vendorIds = rows.map((v) => v.id);

  const [boothAssigns, addonAssigns, users] = await Promise.all([
    db.select().from(vendorBoothAssignments).where(inArray(vendorBoothAssignments.vendorId, vendorIds)),
    db.select().from(vendorAddonAssignments).where(inArray(vendorAddonAssignments.vendorId, vendorIds)),
    db.select({ id: user.id, email: user.email }).from(user).where(
      inArray(user.id, rows.map((v) => v.userId))
    ),
  ]);

  return rows.map((v) => ({
    ...v,
    email: users.find((u) => u.id === v.userId)?.email ?? "",
    boothAssignments: boothAssigns.filter((a) => a.vendorId === v.id),
    addonAssignments: addonAssigns.filter((a) => a.vendorId === v.id),
  }));
}

export async function createVendor(payload: {
  name: string;
  email: string;
  password: string;
  whatsapp: string;
  vendorType: "booth" | "addon";
  eventId: string;
  zoneSlugs?: string[];
  addonIds?: string[];
  notes?: string;
}) {
  const trimmedEmail = payload.email.trim().toLowerCase();

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, trimmedEmail))
    .limit(1);

  if (existing.length > 0) {
    return { success: false, error: "Email sudah terdaftar." };
  }

  try {
    const now = new Date();
    const userId = randomUUID();
    const vendorId = randomUUID();
    const passwordHash = await hashPassword(payload.password);

    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: userId,
        name: payload.name.trim(),
        email: trimmedEmail,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(account).values({
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(userRoles).values({
        userId,
        role: "vendor",
        eventId: payload.eventId,
      });

      await tx.insert(vendors).values({
        id: vendorId,
        userId,
        eventId: payload.eventId,
        name: payload.name.trim(),
        whatsapp: payload.whatsapp.trim(),
        vendorType: payload.vendorType,
        notes: payload.notes?.trim() || null,
        isActive: true,
      });

      if (payload.vendorType === "booth" && payload.zoneSlugs?.length) {
        await tx.insert(vendorBoothAssignments).values(
          payload.zoneSlugs.map((zoneSlug) => ({
            vendorId,
            zoneSlug,
          }))
        );
      }

      if (payload.vendorType === "addon" && payload.addonIds?.length) {
        await tx.insert(vendorAddonAssignments).values(
          payload.addonIds.map((eventAddonId) => ({
            vendorId,
            eventAddonId,
          }))
        );
      }
    });

    revalidatePath("/admin/vendor");

    // V1 — notif akun vendor dibuat (async, tidak blok transaksi)
    void (async () => {
      const message = await renderWaTemplate(WA_KEYS.VENDOR_AKUN_DIBUAT, {
        nama: payload.name.trim(),
        email: payload.email.trim(),
        password: payload.password,
        link_portal: `${process.env.NEXT_PUBLIC_EXPO_URL ?? 'https://expo.forbis2026.id'}/vendor/login`,
      })
      if (message) void sendWhatsApp({ to: payload.whatsapp, message, context: 'vendor-created' })
    })()

    return { success: true };
  } catch (err) {
    console.error("createVendor failed:", err);
    return { success: false, error: "Gagal membuat vendor." };
  }
}

export async function updateVendor(
  vendorId: string,
  payload: {
    name: string;
    whatsapp: string;
    notes?: string;
    zoneSlugs?: string[];
    addonIds?: string[];
    bankName?: string;
    bankAccount?: string;
    bankAccountName?: string;
  }
) {
  try {
    const vendor = await db.query.vendors.findFirst({ where: eq(vendors.id, vendorId) });
    if (!vendor) return { success: false, error: "Vendor tidak ditemukan." };

    await db.transaction(async (tx) => {
      await tx.update(vendors).set({
        name: payload.name.trim(),
        whatsapp: payload.whatsapp.trim(),
        notes: payload.notes?.trim() || null,
        bankName: payload.bankName?.trim() || null,
        bankAccount: payload.bankAccount?.trim() || null,
        bankAccountName: payload.bankAccountName?.trim() || null,
        updatedAt: new Date(),
      }).where(eq(vendors.id, vendorId));

      await tx.update(user).set({ name: payload.name.trim() }).where(eq(user.id, vendor.userId));

      if (vendor.vendorType === "booth") {
        await tx.delete(vendorBoothAssignments).where(eq(vendorBoothAssignments.vendorId, vendorId));
        if (payload.zoneSlugs?.length) {
          await tx.insert(vendorBoothAssignments).values(
            payload.zoneSlugs.map((zoneSlug) => ({ vendorId, zoneSlug }))
          );
        }
      } else {
        await tx.delete(vendorAddonAssignments).where(eq(vendorAddonAssignments.vendorId, vendorId));
        if (payload.addonIds?.length) {
          await tx.insert(vendorAddonAssignments).values(
            payload.addonIds.map((eventAddonId) => ({ vendorId, eventAddonId }))
          );
        }
      }
    });

    revalidatePath("/admin/vendor");
    return { success: true };
  } catch (err) {
    console.error("updateVendor failed:", err);
    return { success: false, error: "Gagal memperbarui vendor." };
  }
}

export async function resetVendorPassword(vendorId: string, newPassword: string) {
  try {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "Password minimal 8 karakter." };
    }

    const vendor = await db.query.vendors.findFirst({ where: eq(vendors.id, vendorId) });
    if (!vendor) return { success: false, error: "Vendor tidak ditemukan." };

    const passwordHash = await hashPassword(newPassword);

    await db.update(account).set({ password: passwordHash }).where(eq(account.userId, vendor.userId));

    revalidatePath("/admin/vendor");
    return { success: true };
  } catch (err) {
    console.error("resetVendorPassword failed:", err);
    return { success: false, error: "Gagal mengubah password." };
  }
}

export async function updateVendorAssignments(
  vendorId: string,
  vendorType: "booth" | "addon",
  payload: { zoneSlugs?: string[]; addonIds?: string[] }
) {
  try {
    await db.transaction(async (tx) => {
      if (vendorType === "booth") {
        await tx.delete(vendorBoothAssignments).where(eq(vendorBoothAssignments.vendorId, vendorId));
        if (payload.zoneSlugs?.length) {
          await tx.insert(vendorBoothAssignments).values(
            payload.zoneSlugs.map((zoneSlug) => ({ vendorId, zoneSlug }))
          );
        }
      } else {
        await tx.delete(vendorAddonAssignments).where(eq(vendorAddonAssignments.vendorId, vendorId));
        if (payload.addonIds?.length) {
          await tx.insert(vendorAddonAssignments).values(
            payload.addonIds.map((eventAddonId) => ({ vendorId, eventAddonId }))
          );
        }
      }
    });

    revalidatePath("/admin/vendor");
    return { success: true };
  } catch (err) {
    console.error("updateVendorAssignments failed:", err);
    return { success: false, error: "Gagal memperbarui penugasan." };
  }
}

export async function toggleVendorActive(vendorId: string, isActive: boolean) {
  try {
    await db.update(vendors).set({ isActive, updatedAt: new Date() }).where(eq(vendors.id, vendorId));
    revalidatePath("/admin/vendor");
    return { success: true };
  } catch (err) {
    console.error("toggleVendorActive failed:", err);
    return { success: false, error: "Gagal mengubah status vendor." };
  }
}

export async function getVendorBoothData(vendorId: string) {
  const assignments = await db
    .select()
    .from(vendorBoothAssignments)
    .where(eq(vendorBoothAssignments.vendorId, vendorId));

  if (assignments.length === 0) return [];

  const zoneSlugs = assignments.map((a) => a.zoneSlug);
  const tenantDb = await createTenantDb(TENANT_SCHEMA);

  const { booths, boothBookings, zones } = await import("@repo/db/schema/tenant");
  const { participantBusinesses, participants } = await import("@repo/db/schema/public");
  const { eq: eqD, inArray: inArrayD } = await import("drizzle-orm");

  const zoneRows = await tenantDb
    .select({ id: zones.id, slug: zones.slug, name: zones.name })
    .from(zones)
    .where(inArrayD(zones.slug, zoneSlugs));

  if (zoneRows.length === 0) return [];

  const zoneIds = zoneRows.map((z) => z.id);

  const boothRows = await tenantDb
    .select({
      id: booths.id,
      code: booths.code,
      name: booths.name,
      status: booths.status,
      zoneId: booths.zoneId,
    })
    .from(booths)
    .where(and(inArrayD(booths.zoneId, zoneIds), eqD(booths.status, "booked")));

  if (boothRows.length === 0) return [];

  const boothIds = boothRows.map((b) => b.id);

  const bookingRows = await tenantDb
    .select({
      boothId: boothBookings.boothId,
      businessId: boothBookings.businessId,
      participantId: boothBookings.participantId,
    })
    .from(boothBookings)
    .where(inArrayD(boothBookings.boothId, boothIds));

  const businessIds = bookingRows.map((b) => b.businessId).filter(Boolean) as string[];
  const participantIds = bookingRows.map((b) => b.participantId).filter(Boolean) as string[];

  const [businessRows, participantRows] = await Promise.all([
    businessIds.length
      ? db.select({ id: participantBusinesses.id, companyName: participantBusinesses.companyName, boothName: participantBusinesses.boothName }).from(participantBusinesses).where(inArray(participantBusinesses.id, businessIds))
      : Promise.resolve([]),
    participantIds.length
      ? db.select({ id: participants.id, name: participants.name }).from(participants).where(inArray(participants.id, participantIds))
      : Promise.resolve([]),
  ]);

  return boothRows.map((booth) => {
    const booking = bookingRows.find((bk) => bk.boothId === booth.id);
    const zone = zoneRows.find((z) => z.id === booth.zoneId);
    const business = businessRows.find((b) => b.id === booking?.businessId);
    const participant = participantRows.find((p) => p.id === booking?.participantId);
    return {
      boothCode: booth.code,
      boothName: booth.name,
      zoneName: zone?.name ?? "",
      companyName: business?.companyName ?? "-",
      tenantBoothName: business?.boothName ?? "-",
      participantName: participant?.name ?? "-",
    };
  });
}

export async function getVendorAddonData(vendorId: string) {
  const assignments = await db
    .select()
    .from(vendorAddonAssignments)
    .where(eq(vendorAddonAssignments.vendorId, vendorId));

  if (assignments.length === 0) return [];

  const addonIds = assignments.map((a) => a.eventAddonId);
  const tenantDb = await createTenantDb(TENANT_SCHEMA);

  const { orders, orderItems, boothBookings, booths, eventAddons } = await import("@repo/db/schema/tenant");
  const { participantBusinesses } = await import("@repo/db/schema/public");
  const { inArray: inArrayD, eq: eqD } = await import("drizzle-orm");

  // Ambil vendorPrice dari event_addons
  const addonMeta = await tenantDb
    .select({ id: eventAddons.id, vendorPrice: eventAddons.vendorPrice })
    .from(eventAddons)
    .where(inArrayD(eventAddons.id, addonIds));

  // order_items dengan item_type='addon' dan reference_id = event_addon.id
  const addonItems = await tenantDb
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      referenceId: orderItems.referenceId,
      title: orderItems.title,
      quantity: orderItems.quantity,
      subtotal: orderItems.subtotal,
    })
    .from(orderItems)
    .where(inArrayD(orderItems.referenceId, addonIds));

  if (addonItems.length === 0) return [];

  const orderIds = [...new Set(addonItems.map((i) => i.orderId))];

  // Untuk tiap order, cari booth_booking-nya dari order_items item_type='booth_booking'
  const boothItems = await tenantDb
    .select({ orderId: orderItems.orderId, referenceId: orderItems.referenceId })
    .from(orderItems)
    .where(inArrayD(orderItems.orderId, orderIds));

  const boothBookingIds = boothItems
    .filter((i) => i.referenceId)
    .map((i) => i.referenceId as string);

  const [orderRows, bookedBooths] = await Promise.all([
    tenantDb
      .select({ id: orders.id, businessId: orders.businessId, participantId: orders.participantId })
      .from(orders)
      .where(inArrayD(orders.id, orderIds)),
    boothBookingIds.length
      ? tenantDb
          .select({ id: boothBookings.id, boothId: boothBookings.boothId })
          .from(boothBookings)
          .where(inArrayD(boothBookings.id, boothBookingIds))
      : Promise.resolve([]),
  ]);

  const businessIds = orderRows.map((o) => o.businessId).filter(Boolean) as string[];
  const participantIds = [...new Set(orderRows.map((o) => o.participantId).filter(Boolean) as string[])];
  const boothIdList = bookedBooths.map((b) => b.boothId).filter(Boolean) as string[];

  const { participants } = await import("@repo/db/schema/public");

  const [businessRows, participantRows, boothCodeRows] = await Promise.all([
    businessIds.length
      ? db
          .select({ id: participantBusinesses.id, companyName: participantBusinesses.companyName })
          .from(participantBusinesses)
          .where(inArray(participantBusinesses.id, businessIds))
      : Promise.resolve([]),
    participantIds.length
      ? db
          .select({ id: participants.id, name: participants.name, whatsapp: participants.whatsapp })
          .from(participants)
          .where(inArray(participants.id, participantIds))
      : Promise.resolve([]),
    boothIdList.length
      ? tenantDb
          .select({ id: booths.id, code: booths.code })
          .from(booths)
          .where(inArrayD(booths.id, boothIdList))
      : Promise.resolve([]),
  ]);

  return addonItems.map((item) => {
    const order = orderRows.find((o) => o.id === item.orderId);
    const boothItem = boothItems.find((bi) => bi.orderId === item.orderId && bi.referenceId !== item.referenceId);
    const booking = bookedBooths.find((b) => b.id === boothItem?.referenceId);
    const booth = boothCodeRows.find((b) => b.id === booking?.boothId);
    const business = businessRows.find((b) => b.id === order?.businessId);
    const participant = participantRows.find((p) => p.id === order?.participantId);
    const meta = addonMeta.find((a) => a.id === item.referenceId);
    const qty = item.quantity ?? 0;
    const vendorPrice = meta?.vendorPrice ?? null;
    return {
      addonName: item.title,
      boothCode: booth?.code ?? "-",
      companyName: business?.companyName ?? "-",
      participantName: participant?.name ?? "-",
      whatsapp: participant?.whatsapp ?? "-",
      quantity: qty,
      vendorPrice,
      vendorSubtotal: vendorPrice != null ? qty * vendorPrice : null,
    };
  });
}

export async function getVendorDashboardStats(vendorId: string) {
  const vendor = await db.query.vendors.findFirst({
    where: eq(vendors.id, vendorId),
    with: { boothAssignments: true, addonAssignments: true },
  });
  if (!vendor) return null;

  const tenantDb = await createTenantDb(TENANT_SCHEMA);
  const { booths, zones, eventAddons } = await import("@repo/db/schema/tenant");
  const { eq: eqD, inArray: inArrayD } = await import("drizzle-orm");

  if (vendor.vendorType === "booth") {
    const zoneSlugs = vendor.boothAssignments.map((a) => a.zoneSlug);
    if (zoneSlugs.length === 0) return { type: "booth" as const, zones: [], totalBooked: 0, totalBooths: 0 };

    const zoneRows = await tenantDb
      .select({ id: zones.id, slug: zones.slug, name: zones.name })
      .from(zones)
      .where(inArrayD(zones.slug, zoneSlugs));

    const zoneIds = zoneRows.map((z) => z.id);
    const boothRows = await tenantDb
      .select({ id: booths.id, zoneId: booths.zoneId, status: booths.status })
      .from(booths)
      .where(inArrayD(booths.zoneId, zoneIds));

    const zoneStats = zoneRows.map((z) => {
      const zoneBooths = boothRows.filter((b) => b.zoneId === z.id);
      return {
        slug: z.slug,
        name: z.name,
        total: zoneBooths.length,
        booked: zoneBooths.filter((b) => b.status === "booked").length,
      };
    });

    return {
      type: "booth" as const,
      zones: zoneStats,
      totalBooted: boothRows.filter((b) => b.status === "booked").length,
      totalBooths: boothRows.length,
    };
  } else {
    const addonIds = vendor.addonAssignments.map((a) => a.eventAddonId);
    if (addonIds.length === 0) return { type: "addon" as const, addons: [], totalOrders: 0, totalQty: 0 };

    const { orderItems } = await import("@repo/db/schema/tenant");

    const [addonRows, itemRows] = await Promise.all([
      tenantDb
        .select({ id: eventAddons.id, name: eventAddons.name })
        .from(eventAddons)
        .where(inArrayD(eventAddons.id, addonIds)),
      tenantDb
        .select({ referenceId: orderItems.referenceId, orderId: orderItems.orderId, quantity: orderItems.quantity })
        .from(orderItems)
        .where(inArrayD(orderItems.referenceId, addonIds)),
    ]);

    const addonStats = addonRows.map((a) => {
      const items = itemRows.filter((i) => i.referenceId === a.id);
      const uniqueOrders = new Set(items.map((i) => i.orderId)).size;
      return {
        id: a.id,
        name: a.name,
        orderCount: uniqueOrders,
        totalQty: items.reduce((s, i) => s + (i.quantity ?? 0), 0),
      };
    });

    const totalQty = itemRows.reduce((s, i) => s + (i.quantity ?? 0), 0);
    const totalOrders = new Set(itemRows.map((i) => i.orderId)).size;

    return {
      type: "addon" as const,
      addons: addonStats,
      totalOrders,
      totalQty,
    };
  }
}

export async function updateVendorBankInfo(
  vendorId: string,
  payload: { bankName: string; bankAccount: string; bankAccountName: string }
) {
  try {
    await db.update(vendors).set({
      bankName: payload.bankName.trim() || null,
      bankAccount: payload.bankAccount.trim() || null,
      bankAccountName: payload.bankAccountName.trim() || null,
      updatedAt: new Date(),
    }).where(eq(vendors.id, vendorId));
    revalidatePath("/expo/vendor/pencairan");
    return { success: true as const };
  } catch (err) {
    console.error("updateVendorBankInfo failed:", err);
    return { success: false as const, error: "Gagal menyimpan rekening." };
  }
}

export async function getVendorClaimableAmount(vendorId: string): Promise<{ totalTagihan: number; totalDicairkan: number; claimable: number }> {
  try {
    const assignments = await db
      .select()
      .from(vendorAddonAssignments)
      .where(eq(vendorAddonAssignments.vendorId, vendorId));

    if (assignments.length === 0) return { totalTagihan: 0, totalDicairkan: 0, claimable: 0 };

    const addonIds = assignments.map((a) => a.eventAddonId);
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    const { orderItems, eventAddons, disbursementRequests } = await import("@repo/db/schema/tenant");
    const { inArray: inArrayD, eq: eqD, and: andD } = await import("drizzle-orm");

    const [addonMeta, items, pastRequests] = await Promise.all([
      tenantDb
        .select({ id: eventAddons.id, vendorPrice: eventAddons.vendorPrice })
        .from(eventAddons)
        .where(inArrayD(eventAddons.id, addonIds)),
      tenantDb
        .select({ referenceId: orderItems.referenceId, quantity: orderItems.quantity })
        .from(orderItems)
        .where(inArrayD(orderItems.referenceId, addonIds)),
      tenantDb
        .select({ requestedAmount: disbursementRequests.requestedAmount, status: disbursementRequests.status })
        .from(disbursementRequests)
        .where(eqD(disbursementRequests.vendorId, vendorId)),
    ]);

    const totalTagihan = items.reduce((sum, item) => {
      const meta = addonMeta.find((m) => m.id === item.referenceId);
      if (!meta?.vendorPrice) return sum;
      return sum + meta.vendorPrice * (item.quantity ?? 0);
    }, 0);

    // Hanya hitung yang sudah benar-benar transferred
    const totalDicairkan = pastRequests
      .filter((r) => r.status === "transferred")
      .reduce((sum, r) => sum + r.requestedAmount, 0);

    return { totalTagihan, totalDicairkan, claimable: Math.max(0, totalTagihan - totalDicairkan) };
  } catch {
    return { totalTagihan: 0, totalDicairkan: 0, claimable: 0 };
  }
}
