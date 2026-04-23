import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { listMediaAssets, getStorageStats } from "@/actions/media";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MediaLibraryClient } from "@/components/admin/media/MediaLibraryClient";
import { auth } from "@/lib/auth";
import { db } from "@repo/db";
import { userRoles } from "@repo/db/schema/public";

const ADMIN_MEDIA_ROLES = new Set(["super_admin", "admin", "finance", "event_crew"]);


export const metadata = {
  title: "Media",
};

export default async function MediaLibraryPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/admin/login");
  }

  const roles = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, session.user.id));

  if (!roles.some((row) => ADMIN_MEDIA_ROLES.has(row.role))) {
    redirect("/admin/login");
  }

  const [assets, stats] = await Promise.all([
    listMediaAssets({ limit: 60 }),
    getStorageStats(),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Media Library"
        title="File & Aset"
        description="Kelola semua gambar, dokumen, dan file yang dipakai di sistem. Klik item untuk melihat detail dan mengubah metadata."
      />

      <MediaLibraryClient initialAssets={assets} initialStats={stats} />
    </div>
  );
}
