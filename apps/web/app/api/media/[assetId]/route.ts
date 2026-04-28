import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createTenantDb } from "@repo/db";
import { db } from "@repo/db";
import { invoices } from "@repo/db/schema/tenant";
import { mediaAssets, userRoles } from "@repo/db/schema/public";
import { generatePresignedGetUrl } from "@/lib/minio-storage";

const ADMIN_MEDIA_ROLES = new Set(["super_admin", "admin", "finance", "event_crew"]);
const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

async function resolveSessionUserId() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  return session?.user?.id ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;

  const asset = await db.query.mediaAssets.findFirst({
    where: and(eq(mediaAssets.id, assetId), isNull(mediaAssets.deletedAt)),
  });

  if (!asset || asset.status === "deleted") {
    return NextResponse.json({ error: "Asset tidak ditemukan." }, { status: 404 });
  }

  if (asset.visibility === "public") {
    return NextResponse.redirect(asset.publicUrl ?? generatePresignedGetUrl(asset.objectKey, 3600));
  }

  const publicToken = request.nextUrl.searchParams.get("publicToken")?.trim();
  if (publicToken && asset.ownerParticipantId) {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const invoice = await tenantDb.query.invoices.findFirst({
      where: eq(invoices.publicToken, publicToken),
    });

    if (invoice?.participantId && invoice.participantId === asset.ownerParticipantId) {
      return NextResponse.redirect(generatePresignedGetUrl(asset.objectKey, 3600));
    }
  }

  const sessionUserId = await resolveSessionUserId();
  if (!sessionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roles = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, sessionUserId));
  const isAdmin = roles.some((row) => ADMIN_MEDIA_ROLES.has(row.role));
  const isOwner = Boolean(asset.ownerUserId && asset.ownerUserId === sessionUserId);

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const presignedUrl = generatePresignedGetUrl(asset.objectKey, 3600);
  return NextResponse.redirect(presignedUrl);
}
