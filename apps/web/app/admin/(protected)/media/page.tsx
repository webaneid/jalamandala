import { requireRoles } from "@/lib/admin-auth";
import { listMediaAssets, getStorageStats } from "@/actions/media";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MediaLibraryClient } from "@/components/admin/media/MediaLibraryClient";

export const metadata = {
  title: "Media",
};

export default async function MediaLibraryPage() {
  await requireRoles([]);

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
