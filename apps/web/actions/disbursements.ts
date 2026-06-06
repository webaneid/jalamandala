"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { createTenantDb, db } from "@repo/db";
import { disbursementRequests, disbursementTransfers, cashflowLedger, invoices } from "@repo/db/schema/tenant";
import { expoEvents, vendors } from "@repo/db/schema/public";
import { sendWhatsApp } from "@/lib/whatsapp";
import { renderWaTemplate, WA_KEYS } from "@/lib/whatsapp-template";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

async function getActiveEventId(): Promise<string> {
  const event = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.isActive, true),
  });
  if (!event) throw new Error("Tidak ada event aktif.");
  return event.id;
}

async function getVendorWa(vendorId: string | null): Promise<{ name: string; whatsapp: string } | null> {
  if (!vendorId) return null;
  try {
    const vendor = await db.query.vendors.findFirst({ where: eq(vendors.id, vendorId) });
    return vendor?.whatsapp ? { name: vendor.name, whatsapp: vendor.whatsapp } : null;
  } catch { return null; }
}

const fmtRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

async function notifyFinanceF1(req: {
  id: string;
  requestedByName: string;
  requestedAmount: number;
  purposeDescription: string;
  destBankName: string;
  destAccountNumber: string;
  destAccountName: string;
}) {
  try {
    const event = await db.query.expoEvents.findFirst({ where: eq(expoEvents.isActive, true) });
    const numbers: string[] = event?.financeWaNumbers ?? [];
    if (numbers.length === 0) return;

    const message = await renderWaTemplate(WA_KEYS.FINANCE_PENCAIRAN_BARU, {
      nama: req.requestedByName,
      jumlah: fmtRp(req.requestedAmount),
      perusahaan: req.purposeDescription,
      bank: req.destBankName,
      rekening: req.destAccountNumber,
      atas_nama: req.destAccountName,
      link_review: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.forbis.id'}/admin/keuangan/pencairan/${req.id}`,
    });
    if (!message) return;

    for (const number of numbers) {
      void sendWhatsApp({ to: number, message, context: 'disbursement-f1' });
    }
  } catch { /* non-blocking */ }
}

export type DisbursementStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "transferred"
  | "cancelled";

export type PurposeType = "vendor" | "operational" | "refund" | "other";

export async function getDisbursements() {
  try {
    const eventId = await getActiveEventId();
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    const rows = await tenantDb
      .select()
      .from(disbursementRequests)
      .where(eq(disbursementRequests.eventId, eventId))
      .orderBy(desc(disbursementRequests.createdAt));

    return { success: true as const, data: rows };
  } catch (err) {
    console.error("getDisbursements failed:", err);
    return { success: false as const, error: "Gagal memuat data pencairan." };
  }
}

export async function getDisbursement(id: string) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    const request = await tenantDb.query.disbursementRequests.findFirst({
      where: eq(disbursementRequests.id, id),
      with: { transfer: true },
    });

    if (!request) return { success: false as const, error: "Permohonan tidak ditemukan." };

    // Fetch vendor name if applicable
    let vendorName: string | null = null;
    if (request.vendorId) {
      const vendor = await db.query.vendors.findFirst({
        where: eq(vendors.id, request.vendorId),
      });
      vendorName = vendor?.name ?? null;
    }

    return { success: true as const, data: { ...request, vendorName } };
  } catch (err) {
    console.error("getDisbursement failed:", err);
    return { success: false as const, error: "Gagal memuat detail pencairan." };
  }
}

export async function createDisbursement(payload: {
  requestedBy: string;
  requestedByName: string;
  purposeType: PurposeType;
  purposeDescription: string;
  vendorId?: string | null;
  vendorAddonRef?: string;
  requestedAmount: number;
  destBankName: string;
  destAccountNumber: string;
  destAccountName: string;
  notes?: string;
  submit?: boolean; // true = langsung submit, false = simpan draft
}) {
  try {
    if (!payload.purposeDescription.trim()) {
      return { success: false as const, error: "Deskripsi tujuan wajib diisi." };
    }
    if (payload.requestedAmount <= 0) {
      return { success: false as const, error: "Jumlah harus lebih dari 0." };
    }
    if (!payload.destBankName.trim() || !payload.destAccountNumber.trim() || !payload.destAccountName.trim()) {
      return { success: false as const, error: "Data rekening tujuan wajib lengkap." };
    }

    const eventId = await getActiveEventId();
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    const inserted = await tenantDb
      .insert(disbursementRequests)
      .values({
        requestedBy: payload.requestedBy,
        requestedByName: payload.requestedByName,
        purposeType: payload.purposeType,
        purposeDescription: payload.purposeDescription.trim(),
        vendorId: payload.vendorId ?? null,
        vendorAddonRef: payload.vendorAddonRef?.trim() || null,
        requestedAmount: payload.requestedAmount,
        destBankName: payload.destBankName.trim(),
        destAccountNumber: payload.destAccountNumber.trim(),
        destAccountName: payload.destAccountName.trim(),
        notes: payload.notes?.trim() || null,
        status: payload.submit ? "submitted" : "draft",
        eventId,
      })
      .returning({ id: disbursementRequests.id });

    const created = inserted[0];
    if (!created) return { success: false as const, error: "Gagal membuat permohonan." };

    if (payload.submit) {
      void notifyFinanceF1({
        id: created.id,
        requestedByName: payload.requestedByName,
        requestedAmount: payload.requestedAmount,
        purposeDescription: payload.purposeDescription,
        destBankName: payload.destBankName,
        destAccountNumber: payload.destAccountNumber,
        destAccountName: payload.destAccountName,
      });
    }

    revalidatePath("/admin/keuangan/pencairan");
    return { success: true as const, id: created.id };
  } catch (err) {
    console.error("createDisbursement failed:", err);
    return { success: false as const, error: "Gagal membuat permohonan." };
  }
}

export async function submitDisbursement(id: string) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const req = await tenantDb.query.disbursementRequests.findFirst({
      where: eq(disbursementRequests.id, id),
    });
    if (!req) return { success: false as const, error: "Permohonan tidak ditemukan." };
    if (req.status !== "draft") return { success: false as const, error: "Hanya draft yang bisa disubmit." };

    await tenantDb
      .update(disbursementRequests)
      .set({ status: "submitted", updatedAt: new Date() })
      .where(eq(disbursementRequests.id, id));

    void notifyFinanceF1({
      id: req.id,
      requestedByName: req.requestedByName,
      requestedAmount: req.requestedAmount,
      purposeDescription: req.purposeDescription,
      destBankName: req.destBankName,
      destAccountNumber: req.destAccountNumber,
      destAccountName: req.destAccountName,
    });

    revalidatePath("/admin/keuangan/pencairan");
    return { success: true as const };
  } catch (err) {
    console.error("submitDisbursement failed:", err);
    return { success: false as const, error: "Gagal submit permohonan." };
  }
}

export async function approveDisbursement(
  id: string,
  approvedBy: string,
  approvedByName: string
) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const req = await tenantDb.query.disbursementRequests.findFirst({
      where: eq(disbursementRequests.id, id),
    });
    if (!req) return { success: false as const, error: "Permohonan tidak ditemukan." };
    if (req.status !== "submitted") return { success: false as const, error: "Hanya permohonan submitted yang bisa disetujui." };

    await tenantDb
      .update(disbursementRequests)
      .set({
        status: "approved",
        approvedBy,
        approvedByName,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(disbursementRequests.id, id));

    void (async () => {
      const vendor = await getVendorWa(req.vendorId ?? null);
      if (!vendor) return;
      const message = await renderWaTemplate(WA_KEYS.PENCAIRAN_DISETUJUI, {
        nama: vendor.name,
        jumlah: fmtRp(req.requestedAmount),
        bank: req.destBankName,
        rekening: req.destAccountNumber,
        atas_nama: req.destAccountName,
        link_portal: `${process.env.NEXT_PUBLIC_EXPO_URL ?? 'https://expo.forbis.id'}/vendor/pencairan`,
      });
      if (message) void sendWhatsApp({ to: vendor.whatsapp, message, context: 'disbursement-v3' });
    })();

    revalidatePath("/admin/keuangan/pencairan");
    return { success: true as const };
  } catch (err) {
    console.error("approveDisbursement failed:", err);
    return { success: false as const, error: "Gagal menyetujui permohonan." };
  }
}

export async function rejectDisbursement(
  id: string,
  rejectedBy: string,
  rejectedByName: string,
  reason: string
) {
  try {
    if (!reason.trim()) return { success: false as const, error: "Alasan penolakan wajib diisi." };

    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const req = await tenantDb.query.disbursementRequests.findFirst({
      where: eq(disbursementRequests.id, id),
    });
    if (!req) return { success: false as const, error: "Permohonan tidak ditemukan." };
    if (req.status !== "submitted") return { success: false as const, error: "Hanya permohonan submitted yang bisa ditolak." };

    await tenantDb
      .update(disbursementRequests)
      .set({
        status: "rejected",
        rejectedBy,
        rejectedByName,
        rejectedAt: new Date(),
        rejectionReason: reason.trim(),
        updatedAt: new Date(),
      })
      .where(eq(disbursementRequests.id, id));

    void (async () => {
      const vendor = await getVendorWa(req.vendorId ?? null);
      if (!vendor) return;
      const message = await renderWaTemplate(WA_KEYS.PENCAIRAN_DITOLAK, {
        nama: vendor.name,
        jumlah: fmtRp(req.requestedAmount),
        alasan: reason.trim(),
      });
      if (message) void sendWhatsApp({ to: vendor.whatsapp, message, context: 'disbursement-v4' });
    })();

    revalidatePath("/admin/keuangan/pencairan");
    return { success: true as const };
  } catch (err) {
    console.error("rejectDisbursement failed:", err);
    return { success: false as const, error: "Gagal menolak permohonan." };
  }
}

export async function cancelDisbursement(id: string) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const req = await tenantDb.query.disbursementRequests.findFirst({
      where: eq(disbursementRequests.id, id),
    });
    if (!req) return { success: false as const, error: "Permohonan tidak ditemukan." };
    if (!["draft", "submitted"].includes(req.status)) {
      return { success: false as const, error: "Hanya draft atau submitted yang bisa dibatalkan." };
    }

    await tenantDb
      .update(disbursementRequests)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(disbursementRequests.id, id));

    revalidatePath("/admin/keuangan/pencairan");
    return { success: true as const };
  } catch (err) {
    console.error("cancelDisbursement failed:", err);
    return { success: false as const, error: "Gagal membatalkan permohonan." };
  }
}

export async function confirmTransfer(
  requestId: string,
  payload: {
    transferredBy: string;
    transferredByName: string;
    transferredAt: Date;
    sourceChannelId?: string;
    sourceChannelLabel?: string;
    destBankName: string;
    destAccountNumber: string;
    destAccountName: string;
    grossAmount: number;
    transferFee: number;
    proofAssetUrl?: string;
  }
) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const req = await tenantDb.query.disbursementRequests.findFirst({
      where: eq(disbursementRequests.id, requestId),
    });
    if (!req) return { success: false as const, error: "Permohonan tidak ditemukan." };
    if (req.status !== "approved") return { success: false as const, error: "Hanya permohonan approved yang bisa dikonfirmasi." };

    const netAmount = payload.grossAmount - payload.transferFee;
    if (netAmount < 0) return { success: false as const, error: "Biaya transfer melebihi jumlah transfer." };

    await tenantDb.transaction(async (tx) => {
      await tx.insert(disbursementTransfers).values({
        requestId,
        transferredAt: payload.transferredAt,
        sourceChannelId: payload.sourceChannelId ?? null,
        sourceChannelLabel: payload.sourceChannelLabel ?? null,
        destBankName: payload.destBankName.trim(),
        destAccountNumber: payload.destAccountNumber.trim(),
        destAccountName: payload.destAccountName.trim(),
        grossAmount: payload.grossAmount,
        transferFee: payload.transferFee,
        netAmount,
        proofAssetUrl: payload.proofAssetUrl ?? null,
        transferredBy: payload.transferredBy,
        transferredByName: payload.transferredByName,
      });

      await tx
        .update(disbursementRequests)
        .set({ status: "transferred", updatedAt: new Date() })
        .where(eq(disbursementRequests.id, requestId));

      await tx.insert(cashflowLedger).values({
        transactionDate: payload.transferredAt,
        type: "cash_out",
        category: req.purposeType,
        amount: payload.grossAmount,
        description: `[Pencairan] ${req.purposeDescription}`,
        referenceDisbursementId: requestId,
      });

      // Jika refund overpayment: clear overpaymentAmount di invoice
      if (req.purposeType === "refund" && req.referenceInvoiceId) {
        await tx
          .update(invoices)
          .set({ overpaymentAmount: 0, updatedAt: new Date() })
          .where(eq(invoices.id, req.referenceInvoiceId));
      }
    });

    void (async () => {
      const vendor = await getVendorWa(req.vendorId ?? null);
      if (!vendor) return;
      const time = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(payload.transferredAt);
      const message = await renderWaTemplate(WA_KEYS.PENCAIRAN_DITRANSFER, {
        nama: vendor.name,
        jumlah: fmtRp(netAmount),
        biaya_transfer: fmtRp(payload.transferFee),
        bank: payload.destBankName,
        rekening: payload.destAccountNumber,
        waktu: time,
      });
      if (message) void sendWhatsApp({ to: vendor.whatsapp, message, context: 'disbursement-v5' });
    })();

    revalidatePath("/admin/keuangan/pencairan");
    revalidatePath("/admin/keuangan/cashflow");
    revalidatePath(`/admin/keuangan/pencairan/${requestId}`);
    if (req.purposeType === "refund" && req.referenceInvoiceId) {
      revalidatePath(`/admin/keuangan/${req.referenceInvoiceId}`);
      revalidatePath("/admin/keuangan");
    }
    return { success: true as const };
  } catch (err) {
    console.error("confirmTransfer failed:", err);
    return { success: false as const, error: "Gagal konfirmasi transfer." };
  }
}

export async function getVendorsForDisbursement() {
  try {
    const event = await db.query.expoEvents.findFirst({
      where: eq(expoEvents.isActive, true),
    });
    if (!event) return { success: true as const, data: [] };

    const rows = await db
      .select({
        id: vendors.id,
        name: vendors.name,
        vendorType: vendors.vendorType,
        bankName: vendors.bankName,
        bankAccount: vendors.bankAccount,
        bankAccountName: vendors.bankAccountName,
      })
      .from(vendors)
      .where(and(eq(vendors.eventId, event.id), eq(vendors.isActive, true)));

    return { success: true as const, data: rows };
  } catch (err) {
    return { success: true as const, data: [] };
  }
}

export async function getPaymentChannelsForDisbursement() {
  try {
    const { paymentChannels } = await import("@repo/db/schema/public");
    const event = await db.query.expoEvents.findFirst({
      where: eq(expoEvents.isActive, true),
    });
    if (!event) return { success: true as const, data: [] };

    const rows = await db
      .select({
        id: paymentChannels.id,
        label: paymentChannels.label,
        type: paymentChannels.type,
        bankName: paymentChannels.bankName,
        accountNumber: paymentChannels.accountNumber,
        accountName: paymentChannels.accountName,
      })
      .from(paymentChannels)
      .where(and(eq(paymentChannels.eventId, event.id), eq(paymentChannels.isActive, true)));

    return { success: true as const, data: rows };
  } catch (err) {
    return { success: true as const, data: [] };
  }
}

export async function getVendorDisbursements(vendorId: string) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const rows = await tenantDb
      .select()
      .from(disbursementRequests)
      .where(eq(disbursementRequests.vendorId, vendorId))
      .orderBy(desc(disbursementRequests.createdAt));
    return { success: true as const, data: rows };
  } catch (err) {
    console.error("getVendorDisbursements failed:", err);
    return { success: false as const, data: [] as typeof disbursementRequests.$inferSelect[] };
  }
}

export async function createVendorDisbursementRequest(payload: {
  vendorId: string;
  requestedBy: string;
  requestedByName: string;
  purposeDescription: string;
  requestedAmount: number;
  destBankName: string;
  destAccountNumber: string;
  destAccountName: string;
  notes?: string;
  submit: boolean;
}) {
  try {
    if (!payload.purposeDescription.trim()) return { success: false as const, error: "Deskripsi wajib diisi." };
    if (!payload.requestedAmount || payload.requestedAmount <= 0) return { success: false as const, error: "Jumlah harus lebih dari 0." };
    if (!payload.destBankName.trim() || !payload.destAccountNumber.trim() || !payload.destAccountName.trim()) {
      return { success: false as const, error: "Data rekening tujuan wajib diisi." };
    }

    const eventId = await getActiveEventId();
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    const inserted = await tenantDb
      .insert(disbursementRequests)
      .values({
        requestedBy: payload.requestedBy,
        requestedByName: payload.requestedByName,
        purposeType: "vendor",
        purposeDescription: payload.purposeDescription.trim(),
        vendorId: payload.vendorId,
        requestedAmount: payload.requestedAmount,
        destBankName: payload.destBankName.trim(),
        destAccountNumber: payload.destAccountNumber.trim(),
        destAccountName: payload.destAccountName.trim(),
        notes: payload.notes?.trim() || null,
        status: payload.submit ? "submitted" : "draft",
        eventId,
      })
      .returning({ id: disbursementRequests.id });

    const created = inserted[0];
    if (!created) return { success: false as const, error: "Gagal membuat permohonan." };
    revalidatePath("/expo/vendor/pencairan");
    return { success: true as const, id: created.id };
  } catch (err) {
    console.error("createVendorDisbursementRequest failed:", err);
    return { success: false as const, error: "Gagal membuat permohonan." };
  }
}

export async function cancelVendorDisbursement(id: string, vendorId: string) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const req = await tenantDb.query.disbursementRequests.findFirst({
      where: and(eq(disbursementRequests.id, id), eq(disbursementRequests.vendorId, vendorId)),
    });
    if (!req) return { success: false as const, error: "Permohonan tidak ditemukan." };
    if (req.status !== "draft" && req.status !== "submitted") {
      return { success: false as const, error: "Tidak dapat dibatalkan." };
    }
    await tenantDb.update(disbursementRequests)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(disbursementRequests.id, id));
    revalidatePath("/expo/vendor/pencairan");
    return { success: true as const };
  } catch (err) {
    return { success: false as const, error: "Gagal membatalkan." };
  }
}
