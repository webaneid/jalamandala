import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

import { db } from "@repo/db";
import { expoEvents } from "@repo/db/schema/public";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PageEditor } from "@/components/admin/pages/PageEditor";


export const metadata = {
  title: "Tambah Laman",
};

export default async function TambahLamanPage() {
  const configuredSchemaName = process.env.TENANT_SCHEMA?.trim();
  const activeEvent =
    (configuredSchemaName
      ? await db.query.expoEvents.findFirst({
          where: eq(expoEvents.schemaName, configuredSchemaName),
        })
      : null) ??
    (await db.query.expoEvents.findFirst({
      where: eq(expoEvents.isActive, true),
    }));

  if (!activeEvent) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Tambah Laman Baru"
        title="Buat Halaman Baru"
        description="Pilih tipe laman dan publikasikan halaman informasi statis."
        actions={<Link href="/admin/laman" className={buttonVariants({ variant: "outline", className: "rounded-xl" })}>Kembali</Link>}
      />

      <PageEditor eventId={activeEvent.id} eventSlug={activeEvent.slug} />
    </div>
  );
}
