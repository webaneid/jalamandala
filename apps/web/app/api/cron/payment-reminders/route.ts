import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { createTenantDb, db } from "@repo/db";
import { expoEvents, participantBusinesses, participants } from "@repo/db/schema/public";
import { invoices, waRotatorAgents } from "@repo/db/schema/tenant";
import { sendWhatsApp } from "@/lib/whatsapp";
import { renderWaTemplate, WA_KEYS } from "@/lib/whatsapp-template";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";
const EXPO_URL = process.env.NEXT_PUBLIC_EXPO_URL ?? "https://expo.forbis.id";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.forbis.id";

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta",
  }).format(d);

const ACTIVE_REMINDER_STATUSES = [
  "waiting_for_payment",
  "dp_paid",
  "balance_overdue",
] as const;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const now = new Date();

    const event = await db.query.expoEvents.findFirst({
      where: eq(expoEvents.schemaName, TENANT_SCHEMA),
    });
    if (!event) {
      return NextResponse.json({ ok: true, skipped: "event not found" });
    }

    // ── 1. WA reminders: invoices with next_reminder_at <= now ──────────────
    const invoicesNeedingReminder = await tenantDb.query.invoices.findMany({
      where: and(
        inArray(invoices.status, [...ACTIVE_REMINDER_STATUSES]),
        lte(invoices.nextReminderAt, now),
      ),
    });

    let remindersSent = 0;

    if (invoicesNeedingReminder.length > 0) {
      const participantIds = [...new Set(
        invoicesNeedingReminder.map((i) => i.participantId).filter(Boolean)
      )] as string[];
      const businessIds = [...new Set(
        invoicesNeedingReminder.map((i) => i.businessId).filter(Boolean)
      )] as string[];

      const [ptcpRows, bizRows] = await Promise.all([
        participantIds.length > 0
          ? db.query.participants.findMany({
              where: inArray(participants.id, participantIds),
              columns: { id: true, name: true, whatsapp: true },
            })
          : Promise.resolve([]),
        businessIds.length > 0
          ? db.query.participantBusinesses.findMany({
              where: inArray(participantBusinesses.id, businessIds),
              columns: { id: true, companyName: true },
            })
          : Promise.resolve([]),
      ]);

      const ptcpMap = new Map(ptcpRows.map((p) => [p.id, p]));
      const bizMap = new Map(bizRows.map((b) => [b.id, b]));

      for (const invoice of invoicesNeedingReminder) {
        const ptcp = invoice.participantId ? ptcpMap.get(invoice.participantId) : null;
        if (!ptcp?.whatsapp) continue;

        const biz = invoice.businessId ? bizMap.get(invoice.businessId) : null;
        const invoiceUrl = `${EXPO_URL}/invoice/${invoice.publicToken}`;
        const perusahaan = biz?.companyName ?? ptcp.name;
        const sisa = invoice.grandTotal - (invoice.dpAmount ?? 0);

        const sharedVars = {
          nama: ptcp.name,
          perusahaan,
          company_name: perusahaan,
          invoice_number: invoice.invoiceNumber,
          total: fmtRp(invoice.grandTotal),
          invoice_total: fmtRp(invoice.grandTotal),
          jatuh_tempo: invoice.dueDate ? fmtDate(invoice.dueDate) : "-",
          due_date: invoice.dueDate ? fmtDate(invoice.dueDate) : "-",
          dp_amount: fmtRp(invoice.dpAmount ?? 0),
          sisa_pelunasan: fmtRp(sisa > 0 ? sisa : 0),
          balance_due_date: invoice.balanceDueDate ? fmtDate(invoice.balanceDueDate) : "-",
          link_invoice: invoiceUrl,
        };

        const waKey =
          invoice.status === "waiting_for_payment" ? WA_KEYS.PAYMENT_REMINDER :
          invoice.status === "dp_paid" ? WA_KEYS.DP_REMINDER :
          WA_KEYS.BALANCE_OVERDUE_REMINDER;

        const message = await renderWaTemplate(waKey, sharedVars);
        if (!message) continue;

        void sendWhatsApp({ to: ptcp.whatsapp, message, context: "payment-reminder" });

        const nextReminderAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        await tenantDb
          .update(invoices)
          .set({ nextReminderAt, lastReminderSentAt: now, updatedAt: now })
          .where(eq(invoices.id, invoice.id));

        remindersSent++;
      }
    }

    // ── 2. CS H-1 notification: dp_paid invoices expiring in 23–25h ─────────
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const h1Invoices = await tenantDb.query.invoices.findMany({
      where: and(
        eq(invoices.status, "dp_paid"),
        gte(invoices.balanceDueDate, windowStart),
        lt(invoices.balanceDueDate, windowEnd),
        eq(invoices.csNotifiedH1, false),
      ),
    });

    let csNotified = 0;

    if (h1Invoices.length > 0) {
      const csAgents = await tenantDb.query.waRotatorAgents.findMany({
        where: and(eq(waRotatorAgents.eventId, event.id), eq(waRotatorAgents.isActive, true)),
        orderBy: (t) => [asc(t.sortOrder)],
      });

      if (csAgents.length > 0) {
        const h1PtcpIds = [...new Set(h1Invoices.map((i) => i.participantId).filter(Boolean))] as string[];
        const h1BizIds = [...new Set(h1Invoices.map((i) => i.businessId).filter(Boolean))] as string[];

        const [h1Ptcps, h1Bizs] = await Promise.all([
          h1PtcpIds.length > 0
            ? db.query.participants.findMany({
                where: inArray(participants.id, h1PtcpIds),
                columns: { id: true, name: true, whatsapp: true },
              })
            : Promise.resolve([]),
          h1BizIds.length > 0
            ? db.query.participantBusinesses.findMany({
                where: inArray(participantBusinesses.id, h1BizIds),
                columns: { id: true, companyName: true },
              })
            : Promise.resolve([]),
        ]);

        const h1PtcpMap = new Map(h1Ptcps.map((p) => [p.id, p]));
        const h1BizMap = new Map(h1Bizs.map((b) => [b.id, b]));

        const invoiceLines = h1Invoices.map((inv) => {
          const ptcp = inv.participantId ? h1PtcpMap.get(inv.participantId) : null;
          const biz = inv.businessId ? h1BizMap.get(inv.businessId) : null;
          const sisa = inv.grandTotal - (inv.dpAmount ?? 0);
          const deadline = inv.balanceDueDate ? fmtDate(inv.balanceDueDate) : "-";
          return [
            `Nama Peserta : ${ptcp?.name ?? "-"}`,
            `Perusahaan   : ${biz?.companyName ?? ptcp?.name ?? "-"}`,
            `No. Invoice  : ${inv.invoiceNumber}`,
            `DP Dibayar   : ${fmtRp(inv.dpAmount ?? 0)}`,
            `Sisa Lunas   : ${fmtRp(sisa > 0 ? sisa : 0)}`,
            `Deadline     : ${deadline}`,
            `WA Peserta   : ${ptcp?.whatsapp ?? "-"}`,
            `Detail: ${APP_URL}/admin/keuangan/${inv.id}`,
          ].join("\n");
        });

        const batchMsg = [
          "⏰ *Reminder Follow Up Pelunasan — H-1*",
          "",
          "Peserta berikut memiliki deadline pelunasan *besok*:",
          "",
          invoiceLines.join("\n\n---\n\n"),
        ].join("\n");

        for (const agent of csAgents) {
          void sendWhatsApp({ to: agent.waNumber, message: batchMsg, context: "cs-h1-reminder" });
          csNotified++;
        }

        const h1Ids = h1Invoices.map((i) => i.id);
        await tenantDb
          .update(invoices)
          .set({ csNotifiedH1: true, updatedAt: now })
          .where(inArray(invoices.id, h1Ids));
      } else {
        console.warn("payment-reminders: no active CS agents found for H-1 notification");
      }
    }

    return NextResponse.json({ ok: true, remindersSent, csNotified });
  } catch (err) {
    console.error("payment-reminders cron error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
