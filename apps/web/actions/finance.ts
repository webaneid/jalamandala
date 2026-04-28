"use server";

import { and, asc, desc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { getEligibilityRejectionReason } from "@/lib/booth-eligibility";
import { revalidatePath } from "next/cache";
import { sendWhatsApp } from "@/lib/whatsapp";
import { renderWaTemplate, WA_KEYS } from "@/lib/whatsapp-template";

import { attachMediaUsage, uploadPaymentProof } from "@/lib/minio-storage";
import { wibInputToDate } from "@/lib/price-phase";
import { generateDynamicQrisForInvoice } from "@/lib/qris.server";
import { createTenantDb, db } from "@repo/db";
import {
  booths,
  boothBookings,
  cashflowLedger,
  eventAddons,
  invoices,
  invoiceItems,
  invoicePayments,
  orderItems,
  orders,
} from "@repo/db/schema/tenant";
import {
  expoEvents,
  participantBusinesses,
  participantTermsApprovals,
  participants,
  paymentChannels,
  qrisConfigs,
  whatsappConfigs,
} from "@repo/db/schema/public";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function dedupeTextValues(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeText(value);

    if (!normalized || seen.has(normalized.toLowerCase())) {
      continue;
    }

    seen.add(normalized.toLowerCase());
    result.push(normalized);
  }

  return result;
}

function formatBoothFacilityLabel(name: string | null | undefined, value: string | null | undefined) {
  const normalizedName = normalizeText(name);
  const normalizedValue = normalizeText(value);

  if (!normalizedName) return normalizedValue;
  if (!normalizedValue) return normalizedName;

  const compactName = normalizedName.replace(/\s+/g, "").toLowerCase();
  const compactValue = normalizedValue.replace(/\s+/g, "").toLowerCase();

  if (compactName.includes(compactValue)) {
    return normalizedName;
  }

  return `${normalizedName}: ${normalizedValue}`;
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

  if (activeEvent) {
    return activeEvent;
  }

  const firstEvent = await db.query.expoEvents.findFirst({
    orderBy: (table) => [asc(table.createdAt)],
  });

  if (!firstEvent) {
    throw new Error("Event aktif belum tersedia.");
  }

  return firstEvent;
}

async function resolveInvoiceDueDays(): Promise<number> {
  try {
    const event = await resolveActiveEvent();
    return (event as any).invoiceDueDays ?? 1;
  } catch {
    return 1;
  }
}

// ── Expiry helpers ──────────────────────────────────────────────────────────

type TenantDb = Awaited<ReturnType<typeof createTenantDb>>;

async function releaseBoothsForInvoice(
  tenantDb: TenantDb,
  invoiceId: string,
  invoiceItemRows: Array<{ itemType: string; referenceId: string | null }>
) {
  const bookingIds = invoiceItemRows
    .filter((i) => i.itemType === "booth_booking" && i.referenceId)
    .map((i) => i.referenceId as string);

  if (bookingIds.length === 0) return;

  const linkedBookings = await tenantDb
    .select({ boothId: boothBookings.boothId })
    .from(boothBookings)
    .where(inArray(boothBookings.id, bookingIds));

  const boothIds = linkedBookings.map((b) => b.boothId).filter(Boolean) as string[];
  if (boothIds.length > 0) {
    await tenantDb
      .update(booths)
      .set({ status: "open", updatedAt: new Date() })
      .where(inArray(booths.id, boothIds));
  }
}

// Expire all waiting_for_payment invoices past their due date.
// Does NOT expire waiting_confirmation (pending proof) — admin must resolve those manually.
export async function expireOverdueInvoices(): Promise<void> {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const now = new Date();

    const overdueRows = await tenantDb.query.invoices.findMany({
      where: and(eq(invoices.status, "waiting_for_payment"), lt(invoices.dueDate, now)),
      with: { items: true },
    });

    for (const invoice of overdueRows) {
      await releaseBoothsForInvoice(tenantDb, invoice.id, invoice.items);
      await tenantDb
        .update(invoices)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(invoices.id, invoice.id));
    }

    if (overdueRows.length > 0) {
      revalidatePath("/admin/keuangan");
      revalidatePath("/admin/booth");
    }
  } catch (err) {
    console.error("expireOverdueInvoices error:", err);
  }
}

// Send WA reminder for invoices expiring within the next 22–26 hours.
// Window-based dedup: ~4h window minimises duplicate sends.
async function sendExpiryReminders(tenantDb: TenantDb): Promise<void> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 22 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 26 * 60 * 60 * 1000);

    const soonExpiring = await tenantDb.query.invoices.findMany({
      where: and(
        eq(invoices.status, "waiting_for_payment"),
        gte(invoices.dueDate, windowStart),
        lt(invoices.dueDate, windowEnd)
      ),
    });

    for (const invoice of soonExpiring) {
      if (!invoice.participantId) continue;
      void (async () => {
        try {
          const [participant, businessData] = await Promise.all([
            db.query.participants.findFirst({
              where: eq(participants.id, invoice.participantId!),
            }),
            invoice.businessId
              ? db.query.participantBusinesses.findFirst({
                  where: eq(participantBusinesses.id, invoice.businessId),
                  columns: { companyName: true },
                })
              : Promise.resolve(null),
          ]);
          if (!participant?.whatsapp) return;

          const dueDateFmt = invoice.dueDate ? fmtDate(invoice.dueDate) : "-";
          const message = await renderWaTemplate(WA_KEYS.INVOICE_MAU_EXPIRED, {
            nama: participant.name,
            perusahaan: businessData?.companyName ?? participant.name,
            company_name: businessData?.companyName ?? participant.name,
            invoice_number: invoice.invoiceNumber,
            total: fmtRp(invoice.grandTotal),
            invoice_total: fmtRp(invoice.grandTotal),
            jatuh_tempo: dueDateFmt,
            due_date: dueDateFmt,
            link_invoice: `${process.env.NEXT_PUBLIC_EXPO_URL ?? "https://expo.forbis.id"}/invoice/${invoice.publicToken}`,
          });
          if (message) void sendWhatsApp({ to: participant.whatsapp, message, context: "invoice-expiry-reminder" });
        } catch {}
      })();
    }
  } catch (err) {
    console.error("sendExpiryReminders error:", err);
  }
}

// ────────────────────────────────────────────────────────────────────────────

export async function rejectPaymentConfirmation(paymentId: string) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    const payment = await tenantDb.query.invoicePayments.findFirst({
      where: eq(invoicePayments.id, paymentId),
    });

    if (!payment) return { success: false, error: "Data pembayaran tidak ditemukan." };
    if (payment.status !== "pending_verification") {
      return { success: false, error: "Pembayaran tidak dalam status menunggu verifikasi." };
    }

    const invoice = await tenantDb.query.invoices.findFirst({
      where: eq(invoices.id, payment.invoiceId),
      with: { items: true },
    });

    if (!invoice) return { success: false, error: "Invoice tidak ditemukan." };

    await tenantDb
      .update(invoicePayments)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(invoicePayments.id, paymentId));

    const now = new Date();
    const isOverdue = invoice.dueDate != null && invoice.dueDate < now;

    if (isOverdue) {
      await releaseBoothsForInvoice(tenantDb, invoice.id, invoice.items);
      await tenantDb
        .update(invoices)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(invoices.id, invoice.id));
    } else {
      await tenantDb
        .update(invoices)
        .set({ status: "waiting_for_payment", updatedAt: new Date() })
        .where(eq(invoices.id, invoice.id));
    }

    revalidatePath("/admin/keuangan");
    revalidatePath(`/invoice/${invoice.publicToken}`);
    revalidatePath("/admin/booth");
    return { success: true, expired: isOverdue };
  } catch (error) {
    console.error("rejectPaymentConfirmation error:", error);
    return { success: false, error: "Gagal menolak konfirmasi pembayaran." };
  }
}

async function resolvePaymentMethodOption(paymentMethodKey: string | null | undefined) {
  const normalizedKey = normalizeText(paymentMethodKey);

  if (!normalizedKey) {
    return null;
  }

  const activeEvent = await resolveActiveEvent();

  if (normalizedKey.startsWith("bank:")) {
    const paymentChannelId = normalizedKey.slice(5);

    const channel = await db.query.paymentChannels.findFirst({
      where: and(
        eq(paymentChannels.id, paymentChannelId),
        eq(paymentChannels.eventId, activeEvent.id),
        eq(paymentChannels.type, "bank_account")
      ),
    });

    if (!channel) {
      throw new Error("Metode pembayaran rekening tidak ditemukan.");
    }

    return {
      id: channel.id,
      label:
        [channel.bankName, channel.accountName].filter(Boolean).join(" · ") ||
        channel.label ||
        "Rekening",
      type: "bank_account",
    };
  }

  if (normalizedKey === "qris:default") {
    const qrisConfig = await db.query.qrisConfigs.findFirst({
      where: eq(qrisConfigs.eventId, activeEvent.id),
    });

    if (!qrisConfig?.isEnabled) {
      throw new Error("QRIS belum aktif.");
    }

    return {
      id: "qris:default",
      label: qrisConfig.merchantName ? `QRIS · ${qrisConfig.merchantName}` : "QRIS",
      type: "qris",
    };
  }

  throw new Error("Metode pembayaran tidak valid.");
}

const fmtRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)

function createInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();

  return `INV-FORBIS-${year}${month}${day}-${hours}${minutes}-${suffix}`;
}

function resolveBoothPriceGroup({
  boothGroupSlug,
  defaultPriceGroup,
  isForbisMember,
}: {
  boothGroupSlug: string;
  defaultPriceGroup: string | null;
  isForbisMember: boolean;
}) {
  if (boothGroupSlug === "gontor") return "gontor";

  if (boothGroupSlug === "general") {
    return isForbisMember ? "forbis" : "public";
  }

  return defaultPriceGroup ?? (isForbisMember ? "forbis" : "public");
}

function resolvePriceFromRules(
  priceRules: Array<{
    endsAt: Date | null;
    price: number;
    priceGroup: string;
    pricePhase: string;
    startsAt: Date | null;
  }>,
  priceGroup: string
) {
  if (priceGroup === "gontor") return { phase: "free", price: 0 };

  const now = new Date();

  // Find active phase by date range
  for (const phase of ["early_bird", "pre_sale", "regular"] as const) {
    const rule = priceRules.find(
      (r) => r.priceGroup === priceGroup && r.pricePhase === phase
    );
    if (!rule) continue;

    // If neither date is set, this phase has no schedule — skip to next
    if (!rule.startsAt && !rule.endsAt) continue;

    const afterStart = !rule.startsAt || now >= rule.startsAt;
    const beforeEnd = !rule.endsAt || now < rule.endsAt;

    if (afterStart && beforeEnd) {
      return { phase, price: rule.price };
    }
  }

  // Fallback: regular price
  const regularRule = priceRules.find(
    (r) => r.priceGroup === priceGroup && r.pricePhase === "regular"
  );

  return {
    phase: regularRule?.pricePhase ?? "regular",
    price: regularRule?.price ?? 0,
  };
}

export async function createInvoiceFromBookedBooths(businessId: string) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const normalizedBusinessId = normalizeText(businessId);

    if (!normalizedBusinessId) {
      return { success: false, error: "Perusahaan wajib dipilih." };
    }

    const business = await db.query.participantBusinesses.findFirst({
      where: eq(participantBusinesses.id, normalizedBusinessId),
      with: {
        participant: true,
      },
    });

    if (!business) {
      return { success: false, error: "Perusahaan tidak ditemukan." };
    }

    const pendingBookings = await tenantDb.query.boothBookings.findMany({
      where: and(
        eq(boothBookings.businessId, normalizedBusinessId),
        eq(boothBookings.bookingStatus, "booked"),
        isNull(boothBookings.invoiceId)
      ),
      with: {
        booth: {
          with: {
            zone: true,
          },
        },
      },
      orderBy: (table, { asc }) => [asc(table.bookedAt)],
    });

    if (pendingBookings.length === 0) {
      return { success: false, error: "Tidak ada booth booking yang menunggu invoice." };
    }

    const [order] = await tenantDb
      .insert(orders)
      .values({
        businessId: business.id,
        participantId: business.participantId,
        status: "invoice_issued",
      })
      .returning();

    if (!order) {
      return { success: false, error: "Order gagal dibuat." };
    }

    const orderItemPayload = pendingBookings.map((booking) => ({
      description: booking.booth.zone?.name ? `Zona ${booking.booth.zone.name}` : null,
      itemType: "booth_booking",
      orderId: order.id,
      quantity: 1,
      referenceId: booking.id,
      subtotal: booking.finalPrice,
      title: booking.booth.code,
      unitPrice: booking.finalPrice,
    }));

    const insertedOrderItems = await tenantDb.insert(orderItems).values(orderItemPayload).returning();
    const subtotal = insertedOrderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + await resolveInvoiceDueDays());

    const [invoice] = await tenantDb
      .insert(invoices)
      .values({
        dueDate,
        grandTotal: subtotal,
        invoiceNumber: createInvoiceNumber(),
        issueDate,
        orderId: order.id,
        status: "waiting_for_payment",
        subtotal,
        taxAmount: 0,
      })
      .returning();

    if (!invoice) {
      return { success: false, error: "Invoice gagal dibuat." };
    }

    await tenantDb.insert(invoiceItems).values(
      insertedOrderItems.map((item) => ({
        description: item.description,
        invoiceId: invoice.id,
        itemType: item.itemType,
        quantity: item.quantity,
        referenceId: item.referenceId,
        subtotal: item.subtotal,
        title: item.title,
        unitPrice: item.unitPrice,
      }))
    );

    for (const booking of pendingBookings) {
      await tenantDb
        .update(boothBookings)
        .set({
          invoiceId: invoice.id,
          updatedAt: new Date(),
        })
        .where(eq(boothBookings.id, booking.id));
    }

    if (business.participant?.whatsapp) {
      void (async () => {
        const activeEvent = await resolveActiveEvent()
        const firstChannel = await db.query.paymentChannels.findFirst({
          where: and(eq(paymentChannels.eventId, activeEvent.id), eq(paymentChannels.isActive, true), eq(paymentChannels.type, "bank_account")),
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
        })
        const channelLabel = firstChannel ? [firstChannel.bankName, firstChannel.accountName].filter(Boolean).join(" · ") || firstChannel.label : "-"
        const channelInstruction = firstChannel?.accountNumber ?? "-"
        const totalFmt = fmtRp(subtotal)
        const dueDateFmt = invoice.dueDate ? fmtDate(new Date(invoice.dueDate)) : "-"
        const message = await renderWaTemplate(WA_KEYS.INVOICE_TERBIT, {
          nama: business.participant!.name,
          perusahaan: business.companyName,
          company_name: business.companyName,
          invoice_number: invoice.invoiceNumber,
          total: totalFmt,
          invoice_total: totalFmt,
          jatuh_tempo: dueDateFmt,
          due_date: dueDateFmt,
          payment_channel_label: channelLabel,
          payment_instruction: channelInstruction,
          link_invoice: `${process.env.NEXT_PUBLIC_EXPO_URL ?? 'https://expo.forbis.id'}/invoice/${invoice.publicToken}`,
        })
        if (message) void sendWhatsApp({ to: business.participant!.whatsapp, message, context: 'invoice-issued' })
      })()
    }

    revalidatePath("/admin/keuangan");
    revalidatePath("/admin/booth");
    return { success: true };
  } catch (error) {
    console.error("Error creating invoice from booked booths:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal membuat invoice.",
    };
  }
}

export async function updateInvoicePaymentMethod(invoiceId: string, paymentMethodKey: string) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const invoice = await tenantDb.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    if (!invoice) {
      return { success: false, error: "Invoice tidak ditemukan." };
    }

    if (invoice.status === "paid") {
      return { success: false, error: "Invoice sudah lunas dan metode bayar tidak bisa diubah." };
    }

    const paymentMethod = await resolvePaymentMethodOption(paymentMethodKey);

    if (!paymentMethod) {
      return { success: false, error: "Metode pembayaran wajib dipilih." };
    }

    await tenantDb
      .update(invoices)
      .set({
        paymentChannelId: paymentMethod.id,
        paymentChannelLabel: paymentMethod.label,
        paymentChannelType: paymentMethod.type,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoice.id));

    revalidatePath("/admin/keuangan");
    return { success: true };
  } catch (error) {
    console.error("Error updating invoice payment method:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan metode pembayaran.",
    };
  }
}

export async function markInvoiceAsPaid(payload: {
  amount?: number;
  invoiceId: string;
  notes?: string;
  paidAt?: string;
  paymentMethodKey?: string;
  proofData?: { contentType: string; dataUrl: string; fileName: string };
  proofAssetId?: string;
  referenceNumber?: string;
  senderName?: string;
}) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const invoice = await tenantDb.query.invoices.findFirst({
      where: eq(invoices.id, payload.invoiceId),
      with: {
        order: true,
        payments: true,
      },
    });

    if (!invoice) {
      return { success: false, error: "Invoice tidak ditemukan." };
    }

    if (invoice.status === "paid") {
      return { success: false, error: "Invoice ini sudah lunas." };
    }

    const paymentMethod =
      (await resolvePaymentMethodOption(payload.paymentMethodKey)) ??
      (invoice.paymentChannelId && invoice.paymentChannelLabel && invoice.paymentChannelType
        ? {
            id: invoice.paymentChannelId,
            label: invoice.paymentChannelLabel,
            type: invoice.paymentChannelType,
          }
        : null);

    if (!paymentMethod) {
      return { success: false, error: "Metode pembayaran wajib dipilih sebelum invoice dilunasi." };
    }

    const paidAt = wibInputToDate(normalizeText(payload.paidAt) || null) ?? new Date();
    const paymentAmount = payload.amount && payload.amount > 0 ? payload.amount : invoice.grandTotal;

    let proofAssetId: string | null = null;
    if (payload.proofAssetId) {
      proofAssetId = payload.proofAssetId;
    } else if (payload.proofData?.dataUrl) {
      try {
        const uploaded = await uploadPaymentProof(payload.proofData);
        proofAssetId = uploaded.assetId ?? null;
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Gagal mengunggah bukti transfer." };
      }
    }

    await tenantDb.insert(invoicePayments).values({
      amount: paymentAmount,
      invoiceId: invoice.id,
      method: paymentMethod.type,
      notes: normalizeText(payload.notes) || null,
      paidAt,
      paymentChannelId: paymentMethod.id,
      paymentChannelLabel: paymentMethod.label,
      paymentChannelType: paymentMethod.type,
      proofAssetId,
      referenceNumber: normalizeText(payload.referenceNumber) || null,
      senderName: normalizeText(payload.senderName) || null,
      status: "verified",
    });

    // Hitung total terbayar (existing verified + baru)
    const prevPaid = invoice.payments
      .filter((p) => p.status === "verified")
      .reduce((s, p) => s + p.amount, 0);
    const totalPaid = prevPaid + paymentAmount;
    const isFullyPaid = totalPaid >= invoice.grandTotal;

    await tenantDb
      .update(invoices)
      .set({
        paidAt: isFullyPaid ? paidAt : null,
        paymentChannelId: paymentMethod.id,
        paymentChannelLabel: paymentMethod.label,
        paymentChannelType: paymentMethod.type,
        status: isFullyPaid ? "paid" : "waiting_for_payment",
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoice.id));

    await tenantDb.insert(cashflowLedger).values({
      amount: paymentAmount,
      category: "invoice_payment",
      description: `Pembayaran Invoice ${invoice.invoiceNumber}${!isFullyPaid ? " (sebagian)" : ""}`,
      referenceInvoiceId: invoice.id,
      transactionDate: paidAt,
      type: "cash_in",
    });

    if (isFullyPaid) {
      if (invoice.orderId) {
        await tenantDb
          .update(orders)
          .set({ status: "paid", updatedAt: new Date() })
          .where(eq(orders.id, invoice.orderId));
      }

      const linkedItems = await tenantDb
        .select({ referenceId: invoiceItems.referenceId })
        .from(invoiceItems)
        .where(and(eq(invoiceItems.invoiceId, invoice.id), eq(invoiceItems.itemType, "booth_booking")));

      if (linkedItems.length > 0) {
        const bookingIds = linkedItems.map((i) => i.referenceId).filter(Boolean) as string[];
        const linkedBookings = await tenantDb
          .select({ boothId: boothBookings.boothId })
          .from(boothBookings)
          .where(inArray(boothBookings.id, bookingIds));

        const boothIds = linkedBookings.map((b) => b.boothId).filter(Boolean) as string[];
        if (boothIds.length > 0) {
          await tenantDb
            .update(booths)
            .set({ status: "booked", updatedAt: new Date() })
            .where(inArray(booths.id, boothIds));
        }
      }
    }

    revalidatePath("/admin/keuangan");
    revalidatePath("/admin/booth");

    // P4 + E1 — async, tidak blok response
    if (isFullyPaid && invoice.participantId) {
      void (async () => {
        try {
          const ptcp = await db.query.participants.findFirst({
            where: eq(participants.id, invoice.participantId!),
            columns: { whatsapp: true, name: true },
          })
          const biz = invoice.order?.businessId
            ? await db.query.participantBusinesses.findFirst({
                where: eq(participantBusinesses.id, invoice.order.businessId),
                columns: { companyName: true },
              })
            : null

          const invoiceUrl = `${process.env.NEXT_PUBLIC_EXPO_URL ?? 'https://expo.forbis.id'}/invoice/${invoice.publicToken}`

          // P4
          if (ptcp?.whatsapp) {
            const msg = await renderWaTemplate(WA_KEYS.INVOICE_LUNAS, {
              nama: ptcp.name,
              perusahaan: biz?.companyName ?? ptcp.name,
              company_name: biz?.companyName ?? ptcp.name,
              invoice_number: invoice.invoiceNumber,
              jumlah: fmtRp(paymentAmount),
              total: fmtRp(invoice.grandTotal),
              invoice_total: fmtRp(invoice.grandTotal),
              link_invoice: invoiceUrl,
            })
            if (msg) void sendWhatsApp({ to: ptcp.whatsapp, message: msg, context: 'invoice-paid' })
          }

          // E1 — bagian pendaftaran
          const event = await resolveActiveEvent()
          const regNumbers: string[] = (event as any).registrationWaNumbers ?? []
          if (regNumbers.length > 0) {
            const msg = await renderWaTemplate(WA_KEYS.PENDAFTARAN_PESERTA_CONFIRMED, {
              nama: ptcp?.name ?? '-',
              perusahaan: biz?.companyName ?? ptcp?.name ?? '-',
              company_name: biz?.companyName ?? ptcp?.name ?? '-',
              invoice_number: invoice.invoiceNumber,
              whatsapp: ptcp?.whatsapp ?? '-',
            })
            if (msg) {
              for (const number of regNumbers) {
                void sendWhatsApp({ to: number, message: msg, context: 'confirmed-pendaftaran' })
              }
            }
          }
        } catch { /* non-blocking */ }
      })()
    }

    return { success: true, isFullyPaid };
  } catch (error) {
    console.error("Error marking invoice as paid:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menandai invoice sebagai paid.",
    };
  }
}

export async function createManualInvoice(payload: {
  participantId?: string;
  businessId?: string;
  selectedBoothIds?: string[];
  selectedAddons?: Array<{
    addonId: string;
    quantity: number;
  }>;
  customItems?: Array<{
    title: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    itemType: string;
  }>;
  dueDays?: number;
}) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const selectedBoothIds = (payload.selectedBoothIds ?? []).filter(Boolean);
    const selectedAddons = (payload.selectedAddons ?? []).filter(
      (item) => item.addonId && item.quantity > 0
    );
    const customItems = (payload.customItems ?? []).filter(
      (item) => normalizeText(item.title) && item.quantity > 0 && item.unitPrice >= 0
    );

    if (
      selectedBoothIds.length === 0 &&
      selectedAddons.length === 0 &&
      customItems.length === 0
    ) {
      return { success: false, error: "Minimal pilih satu booth, add-on, atau item manual." };
    }

    let participantId = normalizeText(payload.participantId) || null;
    const businessId = normalizeText(payload.businessId) || null;
    let business:
      | {
          companyName: string;
          id: string;
          participant: { isForbisMember: boolean | null; name: string };
          participantId: string;
        }
      | null = null;

    if (businessId) {
      business = await db.query.participantBusinesses.findFirst({
        where: eq(participantBusinesses.id, businessId),
        with: {
          participant: true,
        },
      }) ?? null;

      if (!business) {
        return { success: false, error: "Perusahaan tidak ditemukan." };
      }

      participantId = business.participantId;
    }

    if ((selectedBoothIds.length > 0 || selectedAddons.length > 0) && !business) {
      return {
        success: false,
        error: "Pilih perusahaan terlebih dahulu untuk transaksi booth atau add-on.",
      };
    }

    const selectedBooths =
      selectedBoothIds.length > 0
        ? await tenantDb.query.booths.findMany({
            where: inArray(booths.id, selectedBoothIds),
            with: {
              boothCategory: true,
              boothGroup: true,
              zone: {
                with: {
                  priceRules: true,
                },
              },
            },
          })
        : [];

    if (selectedBooths.length !== selectedBoothIds.length) {
      return { success: false, error: "Sebagian booth yang dipilih tidak ditemukan." };
    }

    for (const booth of selectedBooths) {
      if (booth.status !== "open") {
        return {
          success: false,
          error: `Booth ${booth.code} sudah tidak tersedia untuk transaksi baru.`,
        };
      }
    }

    // Eligibility guard: validate booth group + category against participant's org and business type
    if (business && selectedBooths.length > 0) {
      const participant = await db.query.participants.findFirst({
        where: (table, { eq }) => eq(table.id, business.participantId),
      });
      const businessRow = await db.query.participantBusinesses.findFirst({
        where: (table, { eq }) => eq(table.id, business.id),
      });

      for (const booth of selectedBooths) {
        const rejection = getEligibilityRejectionReason({
          booth: {
            boothCategorySlug: booth.boothCategory.slug,
            boothGroupSlug: booth.boothGroup.slug,
          },
          business: {
            requestedBoothCategorySlug: businessRow?.requestedBoothCategorySlug ?? null,
          },
          participant: {
            organizationGroupSlug: participant?.organizationGroupSlug ?? null,
          },
        });

        if (rejection) {
          return { success: false, error: `Booth ${booth.code}: ${rejection}` };
        }
      }
    }

    const addonCatalog =
      selectedAddons.length > 0
        ? await tenantDb.query.eventAddons.findMany({
            where: inArray(
              eventAddons.id,
              selectedAddons.map((item) => item.addonId)
            ),
            with: {
              addonUnit: true,
            },
          })
        : [];

    if (addonCatalog.length !== selectedAddons.length) {
      return { success: false, error: "Sebagian add-on yang dipilih tidak ditemukan." };
    }

    const invoiceLineItems: Array<{
      description: string | null;
      itemType: string;
      quantity: number;
      referenceId: string | null;
      subtotal: number;
      title: string;
      unitPrice: number;
    }> = [];

    const createdBookingIds: string[] = [];

    for (const booth of selectedBooths) {
      const priceGroup = resolveBoothPriceGroup({
        boothGroupSlug: booth.boothGroup.slug,
        defaultPriceGroup: booth.boothGroup.defaultPriceGroup,
        isForbisMember: business?.participant.isForbisMember ?? false,
      });
      const resolvedPrice = resolvePriceFromRules(booth.zone.priceRules, priceGroup);

      const [booking] = await tenantDb
        .insert(boothBookings)
        .values({
          basePrice: resolvedPrice.price,
          boothId: booth.id,
          bookingStatus: "booked",
          businessId: business!.id,
          finalPrice: resolvedPrice.price,
          participantId: business!.participantId,
          priceCategory: priceGroup,
        })
        .returning();

      if (!booking) {
        return { success: false, error: `Booking untuk booth ${booth.code} gagal dibuat.` };
      }

      createdBookingIds.push(booking.id);

      await tenantDb
        .update(booths)
        .set({
          status: "reserved",
          updatedAt: new Date(),
        })
        .where(eq(booths.id, booth.id));

      invoiceLineItems.push({
        description: booth.zone.name ? `Zona ${booth.zone.name}` : null,
        itemType: "booth_booking",
        quantity: 1,
        referenceId: booking.id,
        subtotal: resolvedPrice.price,
        title: booth.code,
        unitPrice: resolvedPrice.price,
      });
    }

    for (const selection of selectedAddons) {
      const addon = addonCatalog.find((item) => item.id === selection.addonId);

      if (!addon) {
        continue;
      }

      const descriptionParts = [addon.description, addon.addonUnit?.name]
        .filter(Boolean)
        .join(" · ");

      invoiceLineItems.push({
        description: descriptionParts || null,
        itemType: "addon",
        quantity: selection.quantity,
        referenceId: addon.id,
        subtotal: addon.price * selection.quantity,
        title: addon.name,
        unitPrice: addon.price,
      });
    }

    for (const item of customItems) {
      invoiceLineItems.push({
        description: normalizeText(item.description) || null,
        itemType: item.itemType || "custom",
        quantity: item.quantity,
        referenceId: null,
        subtotal: item.quantity * item.unitPrice,
        title: normalizeText(item.title),
        unitPrice: item.unitPrice,
      });
    }

    const subtotal = invoiceLineItems.reduce((sum, item) => sum + item.subtotal, 0);
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    const dueDays = payload.dueDays && payload.dueDays >= 1
      ? Math.floor(payload.dueDays)
      : await resolveInvoiceDueDays();
    dueDate.setDate(dueDate.getDate() + dueDays);

    let orderId: string | null = null;

    if (business && participantId) {
      const [order] = await tenantDb
        .insert(orders)
        .values({
          businessId: business.id,
          notes: null,
          participantId,
          status: "invoice_issued",
        })
        .returning();

      if (!order) {
        return { success: false, error: "Order transaksi gagal dibuat." };
      }

      orderId = order.id;

      await tenantDb.insert(orderItems).values(
        invoiceLineItems.map((item) => ({
          description: item.description,
          itemType: item.itemType,
          orderId: order.id,
          quantity: item.quantity,
          referenceId: item.referenceId,
          subtotal: item.subtotal,
          title: item.title,
          unitPrice: item.unitPrice,
        }))
      );
    }

    const [invoice] = await tenantDb
      .insert(invoices)
      .values({
        businessId,
        orderId,
        participantId,
        recipientName: business?.companyName ?? null,
        recipientEmail: null,
        dueDate,
        grandTotal: subtotal,
        invoiceNumber: createInvoiceNumber(),
        issueDate,
        status: "waiting_for_payment",
        subtotal,
        taxAmount: 0,
      })
      .returning();

    if (!invoice) {
      return { success: false, error: "Gagal membuat invoice." };
    }

    await tenantDb.insert(invoiceItems).values(
      invoiceLineItems.map((item) => ({
        invoiceId: invoice.id,
        itemType: item.itemType || "custom",
        referenceId: item.referenceId,
        title: item.title,
        description: item.description || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      }))
    );

    if (createdBookingIds.length > 0) {
      await tenantDb
        .update(boothBookings)
        .set({
          invoiceId: invoice.id,
          updatedAt: new Date(),
        })
        .where(inArray(boothBookings.id, createdBookingIds));
    }

    if (participantId) {
      void (async () => {
        const [participant, activeEvent] = await Promise.all([
          db.query.participants.findFirst({ where: eq(participants.id, participantId!) }),
          resolveActiveEvent(),
        ])
        if (!participant?.whatsapp) return
        const businessData = businessId
          ? await db.query.participantBusinesses.findFirst({ where: (t, { eq }) => eq(t.id, businessId), columns: { companyName: true } })
          : null
        const firstChannel = await db.query.paymentChannels.findFirst({
          where: and(eq(paymentChannels.eventId, activeEvent.id), eq(paymentChannels.isActive, true), eq(paymentChannels.type, "bank_account")),
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
        })
        const channelLabel = firstChannel ? [firstChannel.bankName, firstChannel.accountName].filter(Boolean).join(" · ") || firstChannel.label : "-"
        const channelInstruction = firstChannel?.accountNumber ?? "-"
        const totalFmt = fmtRp(subtotal)
        const dueDateFmt = invoice.dueDate ? fmtDate(new Date(invoice.dueDate)) : "-"
        const message = await renderWaTemplate(WA_KEYS.INVOICE_TERBIT, {
          nama: participant.name,
          perusahaan: businessData?.companyName ?? participant.name,
          company_name: businessData?.companyName ?? participant.name,
          invoice_number: invoice.invoiceNumber,
          total: totalFmt,
          invoice_total: totalFmt,
          jatuh_tempo: dueDateFmt,
          due_date: dueDateFmt,
          payment_channel_label: channelLabel,
          payment_instruction: channelInstruction,
          link_invoice: `${process.env.NEXT_PUBLIC_EXPO_URL ?? 'https://expo.forbis.id'}/invoice/${invoice.publicToken}`,
        })
        if (message) void sendWhatsApp({ to: participant.whatsapp, message, context: 'invoice-issued' })
      })()
    }

    // Notify finance team
    void (async () => {
      try {
        const event = await resolveActiveEvent()
        const financeNumbers: string[] = event.financeWaNumbers ?? []
        if (!financeNumbers.length) return
        const participantName = business?.companyName
          ? (await db.query.participants.findFirst({ where: eq(participants.id, participantId!), columns: { name: true } }))?.name ?? '-'
          : '-'
        const msg = await renderWaTemplate(WA_KEYS.FINANCE_INVOICE_BARU, {
          nama: participantName,
          perusahaan: business?.companyName ?? participantName,
          invoice_number: invoice.invoiceNumber,
          total: fmtRp(subtotal),
          jatuh_tempo: invoice.dueDate ? fmtDate(invoice.dueDate) : '-',
        })
        if (msg) for (const n of financeNumbers) void sendWhatsApp({ to: n, message: msg, context: 'finance-invoice-baru' })
      } catch { /* non-blocking */ }
    })()

    revalidatePath("/admin/keuangan");
    revalidatePath("/admin/booth");
    return { success: true, data: invoice };
  } catch (error) {
    console.error("Error creating manual invoice:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal membuat invoice manual.",
    };
  }
}

export async function submitPublicPaymentConfirmation(payload: {
  amount: number;
  publicToken: string;
  paidAt: string;
  paymentMethodKey?: string;
  proofData?: { contentType: string; dataUrl: string; fileName: string };
  proofAssetId?: string;
  senderName: string;
}) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    const invoice = await tenantDb.query.invoices.findFirst({
      where: eq(invoices.publicToken, payload.publicToken),
    });

    if (!invoice) return { success: false, error: "Invoice tidak ditemukan." };
    if (invoice.status === "paid") return { success: false, error: "Invoice sudah lunas." };
    if (invoice.status === "cancelled" || invoice.status === "expired") {
      return { success: false, error: "Invoice tidak aktif." };
    }

    // Block if already has a pending_verification payment
    const existingPending = await tenantDb.query.invoicePayments.findFirst({
      where: and(eq(invoicePayments.invoiceId, invoice.id), eq(invoicePayments.status, "pending_verification")),
      columns: { id: true },
    });
    if (existingPending) {
      return { success: false, error: "Konfirmasi pembayaran Anda sedang dalam proses verifikasi. Mohon tunggu konfirmasi dari panitia." };
    }

    const paidAt = wibInputToDate(normalizeText(payload.paidAt) || null);
    if (!paidAt) return { success: false, error: "Tanggal transfer tidak valid." };

    const senderName = normalizeText(payload.senderName);
    if (!senderName) return { success: false, error: "Nama pengirim wajib diisi." };

    let proofAssetId: string | null = null;
    if (payload.proofData?.dataUrl) {
      try {
        const uploaded = await uploadPaymentProof({
          ...payload.proofData,
          ownerParticipantId: invoice.participantId ?? undefined,
          tenantSchema: TENANT_SCHEMA,
        });
        proofAssetId = uploaded.assetId ?? null;
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Gagal mengunggah bukti transfer." };
      }
    }

    const paymentMethod = payload.paymentMethodKey
      ? await resolvePaymentMethodOption(payload.paymentMethodKey).catch(() => null)
      : null;

    const paymentAmount = payload.amount > 0 ? payload.amount : invoice.grandTotal;

    const [createdPayment] = await tenantDb.insert(invoicePayments).values({
      amount: paymentAmount,
      invoiceId: invoice.id,
      method: paymentMethod?.type ?? null,
      paidAt,
      paymentChannelId: paymentMethod?.id ?? null,
      paymentChannelLabel: paymentMethod?.label ?? null,
      paymentChannelType: paymentMethod?.type ?? null,
      proofAssetId,
      senderName,
      status: "pending_verification",
    }).returning({ id: invoicePayments.id });

    if (proofAssetId && createdPayment?.id) {
      await attachMediaUsage({
        assetId: proofAssetId,
        entityId: createdPayment.id,
        entityType: "invoice_payment",
        fieldName: "proof",
        module: "finance",
      });
    }

    // Update invoice status to waiting_confirmation
    await tenantDb
      .update(invoices)
      .set({ status: "waiting_confirmation", updatedAt: new Date() })
      .where(eq(invoices.id, invoice.id));

    // Notify finance team
    void (async () => {
      try {
        const event = await resolveActiveEvent()
        const financeNumbers: string[] = event.financeWaNumbers ?? []
        if (!financeNumbers.length) return
        const [ptcp, biz] = await Promise.all([
          invoice.participantId ? db.query.participants.findFirst({ where: eq(participants.id, invoice.participantId), columns: { name: true } }) : Promise.resolve(null),
          invoice.businessId ? db.query.participantBusinesses.findFirst({ where: eq(participantBusinesses.id, invoice.businessId), columns: { companyName: true } }) : Promise.resolve(null),
        ])
        const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.forbis.id'}/admin/keuangan/${invoice.id}`
        const paymentMethod = payload.paymentMethodKey
          ? await resolvePaymentMethodOption(payload.paymentMethodKey).catch(() => null)
          : null
        const msg = await renderWaTemplate(WA_KEYS.FINANCE_BUKTI_MASUK, {
          nama: ptcp?.name ?? '-',
          perusahaan: biz?.companyName ?? ptcp?.name ?? '-',
          invoice_number: invoice.invoiceNumber,
          total: fmtRp(paymentAmount),
          atas_nama: senderName,
          payment_channel_label: paymentMethod?.label ?? '-',
          link_invoice: invoiceUrl,
        })
        if (msg) for (const n of financeNumbers) void sendWhatsApp({ to: n, message: msg, context: 'finance-bukti-masuk' })
      } catch { /* non-blocking */ }
    })()

    revalidatePath(`/invoice/${payload.publicToken}`);
    return { success: true };
  } catch (error) {
    console.error("Error submitting public payment confirmation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan konfirmasi pembayaran.",
    };
  }
}

export async function verifyPaymentConfirmation(paymentId: string) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    const payment = await tenantDb.query.invoicePayments.findFirst({
      where: eq(invoicePayments.id, paymentId),
    });

    if (!payment) return { success: false, error: "Data pembayaran tidak ditemukan." };
    if (payment.status === "verified") return { success: false, error: "Pembayaran sudah terverifikasi." };

    const invoice = await tenantDb.query.invoices.findFirst({
      where: eq(invoices.id, payment.invoiceId),
      with: { order: true, payments: true },
    });

    if (!invoice) return { success: false, error: "Invoice tidak ditemukan." };

    // Mark payment as verified
    await tenantDb
      .update(invoicePayments)
      .set({ status: "verified", updatedAt: new Date() })
      .where(eq(invoicePayments.id, paymentId));

    // Hitung total verified setelah update
    const prevVerified = invoice.payments
      .filter((p) => p.id !== paymentId && p.status === "verified")
      .reduce((s, p) => s + p.amount, 0);
    const totalPaid = prevVerified + payment.amount;
    const isFullyPaid = totalPaid >= invoice.grandTotal;

    await tenantDb.insert(cashflowLedger).values({
      amount: payment.amount,
      category: "invoice_payment",
      description: `Pembayaran Invoice ${invoice.invoiceNumber}${!isFullyPaid ? " (sebagian)" : ""}`,
      referenceInvoiceId: invoice.id,
      transactionDate: payment.paidAt,
      type: "cash_in",
    });

    if (isFullyPaid) {
      await tenantDb
        .update(invoices)
        .set({
          paidAt: payment.paidAt,
          paymentChannelId: payment.paymentChannelId,
          paymentChannelLabel: payment.paymentChannelLabel,
          paymentChannelType: payment.paymentChannelType,
          status: "paid",
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoice.id));

      if (invoice.orderId) {
        await tenantDb
          .update(orders)
          .set({ status: "paid", updatedAt: new Date() })
          .where(eq(orders.id, invoice.orderId));
      }

      const linkedItems = await tenantDb
        .select({ referenceId: invoiceItems.referenceId })
        .from(invoiceItems)
        .where(and(eq(invoiceItems.invoiceId, invoice.id), eq(invoiceItems.itemType, "booth_booking")));

      if (linkedItems.length > 0) {
        const bookingIds = linkedItems.map((i) => i.referenceId).filter(Boolean) as string[];
        const linkedBookings = await tenantDb
          .select({ boothId: boothBookings.boothId })
          .from(boothBookings)
          .where(inArray(boothBookings.id, bookingIds));

        const boothIds = linkedBookings.map((b) => b.boothId).filter(Boolean) as string[];
        if (boothIds.length > 0) {
          await tenantDb
            .update(booths)
            .set({ status: "booked", updatedAt: new Date() })
            .where(inArray(booths.id, boothIds));
        }
      }
    }

    revalidatePath("/admin/keuangan");
    revalidatePath(`/invoice/${invoice.publicToken}`);

    if (isFullyPaid && invoice.participantId) {
      void (async () => {
        try {
          const [ptcp, biz, event] = await Promise.all([
            db.query.participants.findFirst({ where: eq(participants.id, invoice.participantId!), columns: { whatsapp: true, name: true } }),
            invoice.order?.businessId
              ? db.query.participantBusinesses.findFirst({ where: eq(participantBusinesses.id, invoice.order.businessId), columns: { companyName: true } })
              : Promise.resolve(null),
            resolveActiveEvent(),
          ])
          const invoiceUrl = `${process.env.NEXT_PUBLIC_EXPO_URL ?? 'https://expo.forbis.id'}/invoice/${invoice.publicToken}`

          if (ptcp?.whatsapp) {
            const msg = await renderWaTemplate(WA_KEYS.INVOICE_LUNAS, {
              nama: ptcp.name, perusahaan: biz?.companyName ?? ptcp.name,
              invoice_number: invoice.invoiceNumber, jumlah: fmtRp(payment.amount),
              total: fmtRp(invoice.grandTotal), link_invoice: invoiceUrl,
            })
            if (msg) void sendWhatsApp({ to: ptcp.whatsapp, message: msg, context: 'invoice-paid' })
          }

          const regNumbers: string[] = (event as any).registrationWaNumbers ?? []
          if (regNumbers.length > 0) {
            const msg = await renderWaTemplate(WA_KEYS.PENDAFTARAN_PESERTA_CONFIRMED, {
              nama: ptcp?.name ?? '-', perusahaan: biz?.companyName ?? ptcp?.name ?? '-',
              invoice_number: invoice.invoiceNumber, whatsapp: ptcp?.whatsapp ?? '-',
            })
            if (msg) for (const n of regNumbers) void sendWhatsApp({ to: n, message: msg, context: 'confirmed-pendaftaran' })
          }
        } catch { /* non-blocking */ }
      })()
    }

    return { success: true, isFullyPaid };
  } catch (error) {
    console.error("Error verifying payment confirmation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memverifikasi pembayaran.",
    };
  }
}

export async function getInvoiceByToken(token: string) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    let invoice = await tenantDb.query.invoices.findFirst({
      where: eq(invoices.publicToken, token),
      with: {
        items: true,
        payments: true,
      },
    });

    if (!invoice) return null;

    // Lazy expiry: if waiting_for_payment and past due, expire immediately
    if (invoice.status === "waiting_for_payment" && invoice.dueDate && invoice.dueDate < new Date()) {
      await releaseBoothsForInvoice(tenantDb, invoice.id, invoice.items);
      await tenantDb
        .update(invoices)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(invoices.id, invoice.id));
      invoice = { ...invoice, status: "expired" };
      revalidatePath("/admin/keuangan");
      revalidatePath("/admin/booth");
    }

    // Send H-1 reminder if expiry is 22-26h away and still waiting for payment
    if (invoice.status === "waiting_for_payment") {
      void sendExpiryReminders(tenantDb);
    }

    // Gap #1: participant + business dari public DB
    const [participant, business] = await Promise.all([
      invoice.participantId
        ? db.query.participants.findFirst({
            where: eq(participants.id, invoice.participantId),
          })
        : Promise.resolve(null),
      invoice.businessId
        ? db.query.participantBusinesses.findFirst({
            where: eq(participantBusinesses.id, invoice.businessId),
          })
        : Promise.resolve(null),
    ]);

    // Gap #2: enrich invoice_items per tipe
    const boothBookingIds = invoice.items
      .filter((i) => i.itemType === "booth_booking" && i.referenceId)
      .map((i) => i.referenceId as string);

    const addonIds = invoice.items
      .filter((i) => i.itemType === "addon" && i.referenceId)
      .map((i) => i.referenceId as string);

    const [boothBookingRows, addonRows] = await Promise.all([
      boothBookingIds.length > 0
        ? tenantDb.query.boothBookings.findMany({
            where: inArray(boothBookings.id, boothBookingIds),
            with: {
              booth: {
                with: {
                  facilities: {
                    orderBy: (table, { asc }) => [asc(table.createdAt)],
                    with: {
                      facility: true,
                    },
                  },
                  zone: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      addonIds.length > 0
        ? tenantDb.query.eventAddons.findMany({
            where: inArray(eventAddons.id, addonIds),
            with: { addonUnit: true },
          })
        : Promise.resolve([]),
    ]);

    const boothBookingMap = new Map(boothBookingRows.map((b) => [b.id, b]));
    const addonMap = new Map(addonRows.map((a) => [a.id, a]));

    const enrichedItems = invoice.items.map((item) => {
      let boothCode: string | null = null;
      let boothZoneName: string | null = null;
      let boothWidth: number | null = null;
      let boothHeight: number | null = null;
      let boothFacilities: string[] = [];
      let addonDescription: string | null = null;
      let addonUnitName: string | null = null;

      if (item.itemType === "booth_booking" && item.referenceId) {
        const booking = boothBookingMap.get(item.referenceId);
        if (booking) {
          boothCode = booking.booth.code;
          boothZoneName = booking.booth.zone?.name ?? null;
          boothWidth = booking.booth.width ?? null;
          boothHeight = booking.booth.height ?? null;
          boothFacilities = dedupeTextValues(
            booking.booth.facilities.map((entry) =>
              formatBoothFacilityLabel(entry.facility?.name, entry.value)
            )
          );
        }
      }

      if (item.itemType === "addon" && item.referenceId) {
        const addon = addonMap.get(item.referenceId);
        addonDescription = addon?.description ?? null;
        addonUnitName = addon?.addonUnit?.name ?? null;
      }

      return {
        id: item.id,
        itemType: item.itemType,
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        boothCode,
        boothZoneName,
        boothWidth,
        boothHeight,
        boothFacilities,
        addonDescription,
        addonUnitName,
      };
    });

    // Gap #3: event, paymentChannels, qrisConfig, waConfig
    const event = await resolveActiveEvent();

    const [activeChannels, qrisConfig, waConfig] = await Promise.all([
      db.query.paymentChannels.findMany({
        where: and(
          eq(paymentChannels.eventId, event.id),
          eq(paymentChannels.isActive, true),
          eq(paymentChannels.type, "bank_account")
        ),
        orderBy: (t, { asc }) => [asc(t.sortOrder)],
      }),
      db.query.qrisConfigs.findFirst({
        where: eq(qrisConfigs.eventId, event.id),
      }),
      db.query.whatsappConfigs.findFirst({
        where: and(
          eq(whatsappConfigs.eventId, event.id),
          eq(whatsappConfigs.isActive, true)
        ),
      }),
    ]);

    const qrisDynamic =
      qrisConfig?.isEnabled && qrisConfig.emvPayload && invoice.status !== "paid"
        ? await generateDynamicQrisForInvoice(
            qrisConfig.emvPayload,
            invoice.grandTotal,
            qrisConfig.expiryMinutes ?? 15
          ).catch((error) => {
            console.error("Error generating dynamic QRIS:", error);
            return null;
          })
        : null;

    return {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        grandTotal: invoice.grandTotal,
        paidAt: invoice.paidAt,
        paymentChannelLabel: invoice.paymentChannelLabel,
        paymentChannelType: invoice.paymentChannelType,
        notes: invoice.notes,
        publicToken: invoice.publicToken,
      },
      participant: participant
        ? {
            name: participant.name,
            email: participant.email,
            phone: participant.phone,
            whatsapp: participant.whatsapp,
          }
        : null,
      business: business
        ? {
            companyName: business.companyName,
            brandName: business.brandName,
            boothName: business.boothName,
            companyAddress: business.companyAddress,
            companyPhone: business.companyPhone,
            companyWhatsapp: business.companyWhatsapp,
          }
        : null,
      items: enrichedItems,
      payments: invoice.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        paidAt: p.paidAt,
        method: p.method,
        referenceNumber: p.referenceNumber,
        paymentChannelLabel: p.paymentChannelLabel,
        senderName: p.senderName,
        status: p.status,
        proofAssetId: p.proofAssetId,
      })),
      event: {
        name: event.name,
        slug: event.slug,
        logoAssetId: event.logoAssetId,
        venue: event.venue,
      },
      businessId: invoice.businessId ?? null,
      paymentChannels: activeChannels.map((ch) => ({
        id: ch.id,
        type: ch.type,
        label: ch.label,
        bankName: ch.bankName,
        accountName: ch.accountName,
        accountNumber: ch.accountNumber,
        instruction: ch.instruction,
        isActive: ch.isActive,
      })),
      qrisConfig: qrisConfig
        ? {
            expiryMinutes: qrisConfig.expiryMinutes,
            isEnabled: qrisConfig.isEnabled,
            merchantName: qrisConfig.merchantName,
            imageAssetId: qrisConfig.imageAssetId,
            emvPayload: qrisConfig.emvPayload,
          }
        : null,
      qrisDynamic,
      whatsappSenderId: event.financeWaNumbers?.[0] ?? waConfig?.senderNumber ?? null,
    };
  } catch (error) {
    console.error("Error fetching invoice by token:", error);
    return null;
  }
}

export async function getCashflowLedger() {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    
    const entries = await tenantDb.query.cashflowLedger.findMany({
      orderBy: (table, { desc }) => [desc(table.transactionDate)],
    });

    return { success: true, data: entries };
  } catch (error) {
    console.error("Error fetching cashflow ledger:", error);
    return { success: false, error: "Gagal mengambil data buku kas." };
  }
}

export async function deleteInvoiceCompletely(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    // 1. Ambil invoice untuk dapat participantId dan orderId
    const invoice = await tenantDb.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
      columns: { id: true, orderId: true, participantId: true },
    });

    if (!invoice) {
      return { success: false, error: "Invoice tidak ditemukan." };
    }

    const participantId = invoice.participantId;
    const orderId = invoice.orderId;

    // 2. Cari boothBookings milik peserta ini → ambil boothId untuk reset status
    if (participantId) {
      const bookings = await tenantDb.query.boothBookings.findMany({
        where: eq(boothBookings.participantId, participantId),
        columns: { id: true, boothId: true },
      });
      const boothIds = bookings.map((b) => b.boothId);

      if (bookings.length > 0) {
        await tenantDb.delete(boothBookings).where(eq(boothBookings.participantId, participantId));
      }
      if (boothIds.length > 0) {
        await tenantDb.update(booths).set({ status: "open", updatedAt: new Date() }).where(inArray(booths.id, boothIds));
      }
    }

    // 3. Hapus invoice (cascade → invoiceItems + invoicePayments)
    await tenantDb.delete(invoices).where(eq(invoices.id, invoiceId));

    // 4. Hapus order (cascade → orderItems) jika ada
    if (orderId) {
      await tenantDb.delete(orders).where(eq(orders.id, orderId));
    }

    // 5. Hapus terms approvals terkait invoice ini saja — participant + businesses tetap ada
    if (participantId) {
      await db.delete(participantTermsApprovals).where(eq(participantTermsApprovals.participantId, participantId));
    }

    revalidatePath("/admin/keuangan");
    return { success: true };
  } catch (error) {
    console.error("deleteInvoiceCompletely error:", error);
    return { success: false, error: "Gagal menghapus data. Cek konsol server." };
  }
}
