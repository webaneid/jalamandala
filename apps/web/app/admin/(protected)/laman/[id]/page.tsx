import { notFound } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

import { getEventPageDetail } from "@/actions/pages";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PageEditor } from "@/components/admin/pages/PageEditor";

export default async function EditLamanPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const pageData = await getEventPageDetail(resolvedParams.id);

  if (!pageData) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Edit Laman"
        title={pageData.title}
        description="Kelola dan perbarui konten halaman event."
        actions={<Link href="/admin/laman" className={buttonVariants({ variant: "outline", className: "rounded-xl" })}>Kembali</Link>}
      />

      <PageEditor
        eventId={pageData.eventId}
        eventSlug={pageData.event.slug}
        initialData={{
          ...pageData,
          content: pageData.content,
          excerpt: pageData.excerpt,
          featuredImageAssetId: pageData.featuredImageAssetId,
          seoTitle: pageData.seoTitle,
          seoDescription: pageData.seoDescription,
        }}
      />
    </div>
  );
}
