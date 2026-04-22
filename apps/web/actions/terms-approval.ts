"use server"

import { createHmac, createHash } from "crypto"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import QRCode from "qrcode"

import { db } from "@repo/db"
import { expoEvents, eventPages, participantTermsApprovals } from "@repo/db/schema/public"
import { getPublishedLegalPage } from "@/actions/public-pages"

const APPROVAL_SECRET = process.env.APPROVAL_HMAC_SECRET ?? "jalamandala-terms-secret"

// ─── Helpers ───────────────────────────────────────────────────────────────────

function computeChecksum(content: unknown): string {
  const normalized = JSON.stringify(content ?? "")
  return createHash("sha256").update(normalized).digest("hex")
}

function computeApprovalToken(payload: {
  participantId: string
  eventId: string
  termsPageId: string
  checksum: string
  approvedAtWib: string
}): string {
  const data = [
    payload.participantId,
    payload.eventId,
    payload.termsPageId,
    payload.checksum,
    payload.approvedAtWib,
  ].join("|")
  return createHmac("sha256", APPROVAL_SECRET).update(data).digest("hex")
}

function nowWib(): Date {
  const now = new Date()
  // offset WIB = UTC+7
  return new Date(now.getTime() + 7 * 60 * 60 * 1000)
}

// ─── Public API ────────────────────────────────────────────────────────────────

export type TermsPageData = {
  checksum: string
  content: unknown
  contentFormat: string
  eventId: string
  htmlString: string
  id: string
  slug: string
  title: string
}

export async function getActiveTermsPage(eventSlug: string): Promise<TermsPageData | null> {
  const pageData = await getPublishedLegalPage(eventSlug, "legal_tnc")
  if (!pageData) return null

  // Resolve eventId
  const event = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.slug, eventSlug),
    columns: { id: true },
  })
  if (!event) return null

  let htmlString = ""
  if (pageData.contentFormat === "tiptap_json" && pageData.content) {
    try {
      const { generateHTML } = await import("@tiptap/html")
      const { default: StarterKit } = await import("@tiptap/starter-kit")
      const { default: Image } = await import("@tiptap/extension-image")
      let contentObj = pageData.content
      if (typeof contentObj === "string") {
        try { contentObj = JSON.parse(contentObj) } catch { /* keep as-is */ }
      }
      if (typeof contentObj === "object" && contentObj !== null) {
        htmlString = generateHTML(contentObj as Parameters<typeof generateHTML>[0], [StarterKit, Image])
      }
    } catch { /* fallback */ }
  }
  if (!htmlString) {
    htmlString = typeof pageData.content === "string" ? pageData.content : ""
  }

  return {
    checksum: computeChecksum(pageData.content),
    content: pageData.content,
    contentFormat: pageData.contentFormat,
    eventId: event.id,
    htmlString,
    id: pageData.id,
    slug: pageData.slug,
    title: pageData.title,
  }
}

export async function hasActiveTermsApproval(
  participantId: string,
  eventId: string,
  termsChecksum: string
): Promise<boolean> {
  const approval = await db.query.participantTermsApprovals.findFirst({
    where: and(
      eq(participantTermsApprovals.participantId, participantId),
      eq(participantTermsApprovals.eventId, eventId),
      eq(participantTermsApprovals.termsContentChecksum, termsChecksum),
      eq(participantTermsApprovals.isActive, true)
    ),
    columns: { id: true },
  })
  return !!approval
}

export type CreateTermsApprovalResult =
  | { success: true; approvalId: string; qrDataUrl: string; approvedAtWib: string }
  | { success: false; error: string }

export async function createTermsApproval(payload: {
  eventId: string
  participantId: string
  termsPageId: string
  termsPageSlug: string
  termsPageTitle: string
  termsContentChecksum: string
  termsContentFormat: string
}): Promise<CreateTermsApprovalResult> {
  try {
    const reqHeaders = await headers()
    const ipAddress = reqHeaders.get("x-forwarded-for") ?? reqHeaders.get("x-real-ip") ?? null
    const userAgent = reqHeaders.get("user-agent") ?? null

    const approvedAt = new Date()
    const approvedAtWib = nowWib()
    const approvedAtWibIso = approvedAtWib.toISOString().replace("Z", "+07:00")

    const approvalToken = computeApprovalToken({
      participantId: payload.participantId,
      eventId: payload.eventId,
      termsPageId: payload.termsPageId,
      checksum: payload.termsContentChecksum,
      approvedAtWib: approvedAtWibIso,
    })

    // Deactivate previous approvals for same participant + event
    await db
      .update(participantTermsApprovals)
      .set({ isActive: false })
      .where(
        and(
          eq(participantTermsApprovals.participantId, payload.participantId),
          eq(participantTermsApprovals.eventId, payload.eventId),
          eq(participantTermsApprovals.isActive, true)
        )
      )

    const qrPayload = {
      type: "terms_approval",
      eventId: payload.eventId,
      participantId: payload.participantId,
      termsPageId: payload.termsPageId,
      checksum: payload.termsContentChecksum,
      approvedAtWib: approvedAtWibIso,
      approvalToken,
    }

    const [approval] = await db
      .insert(participantTermsApprovals)
      .values({
        eventId: payload.eventId,
        participantId: payload.participantId,
        termsPageId: payload.termsPageId,
        termsPageSlug: payload.termsPageSlug,
        termsPageTitle: payload.termsPageTitle,
        termsContentChecksum: payload.termsContentChecksum,
        termsContentFormat: payload.termsContentFormat,
        approvedAt,
        approvedAtWib,
        approvalToken,
        qrPayload,
        ipAddress,
        userAgent,
        isActive: true,
      })
      .returning({ id: participantTermsApprovals.id })

    if (!approval) return { success: false, error: "Gagal menyimpan persetujuan." }

    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
      width: 256,
      margin: 1,
      color: { dark: "#134397", light: "#ffffff" },
    })

    return {
      success: true,
      approvalId: approval.id,
      qrDataUrl,
      approvedAtWib: approvedAtWibIso,
    }
  } catch (err) {
    console.error("[createTermsApproval]", err)
    return { success: false, error: "Terjadi kesalahan saat menyimpan persetujuan." }
  }
}
