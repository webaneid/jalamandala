"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@repo/db";
import {
  expoEvents,
  messageTemplates,
  mediaUsages,
  paymentChannels,
  qrisConfigs,
  whatsappConfigs,
} from "@repo/db/schema/public";
import { parseQrisMerchantInfo } from "@/lib/qris";

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeInteger(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value);
}

function normalizeDateTime(value: string | null | undefined) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Tanggal atau waktu tidak valid.");
  }

  return parsed;
}

function normalizeTemplateKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatPaymentChannelLabel(bankName: string, accountName: string) {
  return [bankName, accountName].filter(Boolean).join(" · ");
}

async function resolveActiveEvent() {
  const configuredSchemaName = process.env.TENANT_SCHEMA?.trim();

  if (configuredSchemaName) {
    const schemaEvent = await db.query.expoEvents.findFirst({
      where: eq(expoEvents.schemaName, configuredSchemaName),
    });

    if (schemaEvent) {
      return schemaEvent;
    }
  }

  const activeEvent = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.isActive, true),
  });

  if (!activeEvent) {
    const firstEvent = await db.query.expoEvents.findFirst({
      orderBy: (table) => [asc(table.createdAt)],
    });

    if (firstEvent) {
      return firstEvent;
    }

    throw new Error("Event aktif belum tersedia.");
  }

  return activeEvent;
}

export async function updateEventProfile(payload: {
  endDate?: string;
  logoAssetId?: string | null;
  name: string;
  startDate?: string;
  targetBooths?: number | null;
  targetVisitors?: number | null;
  venue?: string;
  financeWaNumbers?: string[];
  leaderWaNumbers?: string[];
  eventTeamWaNumbers?: string[];
}) {
  try {
    const activeEvent = await resolveActiveEvent();
    const name = normalizeText(payload.name);

    if (!name) {
      return { success: false, error: "Nama event wajib diisi." };
    }

    const parseWaNumbers = (nums?: string[]) =>
      (nums ?? []).map((n) => n.replace(/[\s\-().+]/g, "").replace(/^0/, "62")).filter(Boolean);

    await db
      .update(expoEvents)
      .set({
        endDate: normalizeDateTime(payload.endDate),
        logoAssetId: payload.logoAssetId ?? undefined,
        name,
        startDate: normalizeDateTime(payload.startDate),
        targetBooths: normalizeInteger(payload.targetBooths),
        targetVisitors: normalizeInteger(payload.targetVisitors),
        updatedAt: new Date(),
        venue: normalizeText(payload.venue) || null,
        financeWaNumbers: parseWaNumbers(payload.financeWaNumbers),
        leaderWaNumbers: parseWaNumbers(payload.leaderWaNumbers),
        eventTeamWaNumbers: parseWaNumbers(payload.eventTeamWaNumbers),
      })
      .where(eq(expoEvents.id, activeEvent.id));

    revalidatePath("/admin/setting");
    return { success: true };
  } catch (error) {
    console.error("Error updating event profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan profil event.",
    };
  }
}

export async function upsertPaymentChannel(payload: {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  id?: string;
  isActive?: boolean;
}) {
  try {
    const activeEvent = await resolveActiveEvent();
    const bankName = normalizeText(payload.bankName);
    const accountName = normalizeText(payload.accountName);
    const accountNumber = normalizeText(payload.accountNumber);
    const label = formatPaymentChannelLabel(bankName, accountName);

    if (!bankName) {
      return { success: false, error: "Nama bank wajib diisi." };
    }

    if (!accountName) {
      return { success: false, error: "Nama rekening wajib diisi." };
    }

    if (!accountNumber) {
      return { success: false, error: "Nomor rekening wajib diisi." };
    }

    if (payload.id) {
      await db
        .update(paymentChannels)
        .set({
          accountName,
          accountNumber,
          bankName,
          isActive: payload.isActive ?? true,
          label,
          type: "bank_account",
          updatedAt: new Date(),
        })
        .where(eq(paymentChannels.id, payload.id));
    } else {
      const lastChannel = await db.query.paymentChannels.findFirst({
        where: eq(paymentChannels.eventId, activeEvent.id),
        orderBy: (table) => [desc(table.sortOrder)],
      });

      await db.insert(paymentChannels).values({
        accountName,
        accountNumber,
        bankName,
        eventId: activeEvent.id,
        isActive: payload.isActive ?? true,
        label,
        sortOrder: (lastChannel?.sortOrder ?? 0) + 1,
        type: "bank_account",
      });
    }

    revalidatePath("/admin/setting");
    return { success: true };
  } catch (error) {
    console.error("Error upserting payment channel:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal menyimpan channel pembayaran.",
    };
  }
}

export async function upsertQrisConfig(payload: {
  emvPayload?: string;
  imageAssetId?: string | null;
  isEnabled?: boolean;
  expiryMinutes?: number | null;
}) {
  try {
    const activeEvent = await resolveActiveEvent();
    const emvPayload = normalizeText(payload.emvPayload);
    const isEnabled = payload.isEnabled ?? false;

    if (isEnabled && !emvPayload) {
      return { success: false, error: "EMV payload QRIS wajib diisi saat QRIS diaktifkan." };
    }

    const merchantInfo = emvPayload
      ? parseQrisMerchantInfo(emvPayload)
      : { merchantCity: null, merchantName: null };

    const existingConfig = await db.query.qrisConfigs.findFirst({
      where: eq(qrisConfigs.eventId, activeEvent.id),
    });

    const values = {
      emvPayload: emvPayload || null,
      expiryMinutes: normalizeInteger(payload.expiryMinutes) ?? 15,
      imageAssetId: payload.imageAssetId ?? undefined,
      isEnabled,
      merchantCity: merchantInfo.merchantCity,
      merchantName: merchantInfo.merchantName,
      updatedAt: new Date(),
    };

    let qrisConfigId = existingConfig?.id ?? null;

    if (existingConfig) {
      await db.update(qrisConfigs).set(values).where(eq(qrisConfigs.id, existingConfig.id));
    } else {
      const [inserted] = await db.insert(qrisConfigs).values({
        ...values,
        eventId: activeEvent.id,
      }).returning({ id: qrisConfigs.id });
      qrisConfigId = inserted?.id ?? null;
    }

    if (existingConfig) {
      qrisConfigId = existingConfig.id;
    }

    if (qrisConfigId) {
      const existingUsage = await db.query.mediaUsages.findFirst({
        where: and(
          eq(mediaUsages.entityId, qrisConfigId),
          eq(mediaUsages.entityType, "qris_config"),
          eq(mediaUsages.fieldName, "qris_image")
        ),
      });

      if (payload.imageAssetId) {
        if (!existingUsage) {
          await db.insert(mediaUsages).values({
            assetId: payload.imageAssetId,
            entityId: qrisConfigId,
            entityType: "qris_config",
            fieldName: "qris_image",
            module: "qris",
          });
        } else if (existingUsage.assetId !== payload.imageAssetId) {
          await db
            .update(mediaUsages)
            .set({ assetId: payload.imageAssetId })
            .where(eq(mediaUsages.id, existingUsage.id));
        }
      } else if (existingUsage) {
        await db.delete(mediaUsages).where(eq(mediaUsages.id, existingUsage.id));
      }
    }

    revalidatePath("/admin/setting");
    return { success: true };
  } catch (error) {
    console.error("Error upserting qris config:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan pengaturan QRIS.",
    };
  }
}

export async function deletePaymentChannel(id: string) {
  try {
    await db.delete(paymentChannels).where(eq(paymentChannels.id, id));
    revalidatePath("/admin/setting");
    return { success: true };
  } catch (error) {
    console.error("Error deleting payment channel:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal menghapus channel pembayaran.",
    };
  }
}

export async function upsertWhatsappConfig(payload: {
  apiBaseUrl?: string;
  username?: string;
  password?: string;
  deviceId?: string;
  senderNumber?: string;
  webhookSecret?: string;
  sendDelayMs?: number;
  isActive?: boolean;
}) {
  try {
    const activeEvent = await resolveActiveEvent();
    const apiBaseUrl = normalizeText(payload.apiBaseUrl);
    const username = normalizeText(payload.username);
    const password = normalizeText(payload.password);
    const deviceId = normalizeText(payload.deviceId);
    const senderNumber = normalizeText(payload.senderNumber);
    const webhookSecret = normalizeText(payload.webhookSecret);
    const sendDelayMs = payload.sendDelayMs ?? 2000;

    if (payload.isActive && !apiBaseUrl) {
      return { success: false, error: "Gateway URL wajib diisi saat WhatsApp diaktifkan." };
    }

    if (payload.isActive && !username) {
      return { success: false, error: "Username wajib diisi saat WhatsApp diaktifkan." };
    }

    if (payload.isActive && !password) {
      return { success: false, error: "Password wajib diisi saat WhatsApp diaktifkan." };
    }

    if (payload.isActive && !deviceId) {
      return { success: false, error: "Device ID wajib diisi saat WhatsApp diaktifkan." };
    }

    const existingConfig = await db.query.whatsappConfigs.findFirst({
      where: eq(whatsappConfigs.eventId, activeEvent.id),
    });

    if (existingConfig) {
      await db
        .update(whatsappConfigs)
        .set({
          apiBaseUrl: apiBaseUrl || null,
          username: username || null,
          password: password || null,
          deviceId: deviceId || null,
          senderNumber: senderNumber || null,
          webhookSecret: webhookSecret || null,
          sendDelayMs,
          isActive: payload.isActive ?? false,
          updatedAt: new Date(),
        })
        .where(eq(whatsappConfigs.id, existingConfig.id));
    } else {
      await db.insert(whatsappConfigs).values({
        apiBaseUrl: apiBaseUrl || null,
        username: username || null,
        password: password || null,
        deviceId: deviceId || null,
        senderNumber: senderNumber || null,
        webhookSecret: webhookSecret || null,
        sendDelayMs,
        eventId: activeEvent.id,
        isActive: payload.isActive ?? false,
      });
    }

    revalidatePath("/admin/setting");
    return { success: true };
  } catch (error) {
    console.error("Error upserting whatsapp config:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal menyimpan WhatsApp gateway.",
    };
  }
}

export async function upsertMessageTemplate(payload: {
  bodyTemplate: string;
  id?: string;
  isActive?: boolean;
  key: string;
  title: string;
}) {
  try {
    const activeEvent = await resolveActiveEvent();
    const title = normalizeText(payload.title);
    const bodyTemplate = normalizeText(payload.bodyTemplate);
    const key = normalizeTemplateKey(payload.key);

    if (!title) {
      return { success: false, error: "Judul template wajib diisi." };
    }

    if (!bodyTemplate) {
      return { success: false, error: "Isi template wajib diisi." };
    }

    if (!key) {
      return { success: false, error: "Key template tidak valid." };
    }

    const existingByKey = await db.query.messageTemplates.findFirst({
      where: and(eq(messageTemplates.eventId, activeEvent.id), eq(messageTemplates.key, key)),
    });

    if (existingByKey && existingByKey.id !== payload.id) {
      return { success: false, error: "Key template sudah dipakai." };
    }

    if (payload.id) {
      await db
        .update(messageTemplates)
        .set({
          bodyTemplate,
          isActive: payload.isActive ?? true,
          key,
          title,
          updatedAt: new Date(),
        })
        .where(eq(messageTemplates.id, payload.id));
    } else {
      const lastTemplate = await db.query.messageTemplates.findFirst({
        orderBy: (table) => [desc(table.sortOrder)],
      });

      await db.insert(messageTemplates).values({
        bodyTemplate,
        eventId: activeEvent.id,
        isActive: payload.isActive ?? true,
        key,
        sortOrder: (lastTemplate?.sortOrder ?? 0) + 1,
        title,
      });
    }

    revalidatePath("/admin/setting");
    return { success: true };
  } catch (error) {
    console.error("Error upserting message template:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan template pesan.",
    };
  }
}

export async function deleteMessageTemplate(id: string) {
  try {
    await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
    revalidatePath("/admin/setting");
    return { success: true };
  } catch (error) {
    console.error("Error deleting message template:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menghapus template pesan.",
    };
  }
}

export async function updateInvoiceDueDays(days: number) {
  try {
    const activeEvent = await resolveActiveEvent();
    const safeDays = Math.max(1, Math.floor(days));
    await db.update(expoEvents)
      .set({ invoiceDueDays: safeDays, updatedAt: new Date() })
      .where(eq(expoEvents.id, activeEvent.id));
    revalidatePath("/admin/setting");
    return { success: true };
  } catch (error) {
    console.error("Error updating invoice due days:", error);
    return { success: false, error: "Gagal menyimpan pengaturan." };
  }
}
