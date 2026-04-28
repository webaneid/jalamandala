import { requireRoles } from "@/lib/admin-auth";
import { asc, eq } from "drizzle-orm";
import { FileText } from "lucide-react";

import { db } from "@repo/db";
import { expoEvents } from "@repo/db/schema/public";
import { listEventPages } from "@/actions/pages";

import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PageDashboard } from "@/components/admin/pages/PageDashboard";

async function getPagesData() {
  const configuredSchemaName = process.env.TENANT_SCHEMA?.trim();
  const activeEvent =
    (configuredSchemaName
      ? await db.query.expoEvents.findFirst({
          where: eq(expoEvents.schemaName, configuredSchemaName),
        })
      : null) ??
    (await db.query.expoEvents.findFirst({
      where: eq(expoEvents.isActive, true),
    })) ??
    (await db.query.expoEvents.findFirst({
      orderBy: (table) => [asc(table.createdAt)],
    }));

  if (!activeEvent) {
    return null;
  }

  const pages = await listEventPages(activeEvent.id);

  const publishedCount = pages.filter((p) => p.status === "published").length;
  const draftCount = pages.filter((p) => p.status === "draft").length;

  return {
    pages: pages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      pageType: p.pageType,
      status: p.status,
      updatedAt: p.updatedAt?.toISOString() ?? p.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
    event: {
      id: activeEvent.id,
      name: activeEvent.name,
    },
    summary: {
      draftCount,
      publishedCount,
      total: pages.length,
    },
  };
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-[28px] border-none bg-white/72 shadow-none">
      <CardContent className="space-y-2 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        <p className="text-3xl font-semibold tracking-[-0.05em] text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}


export const metadata = {
  title: "Manajemen Laman",
};

export default async function LamanPage() {
  await requireRoles(["admin"]);
  const data = await getPagesData();

  if (!data) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Laman Event"
          title="Laman belum bisa dimuat"
          description="Belum ada event aktif yang bisa dipakai sebagai konteks laman."
        />

        <AdminEmptyState
          icon={FileText}
          title="Event aktif belum ditemukan"
          description="Pastikan minimal ada satu event aktif atau schema event yang sedang dipakai sudah benar."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Laman Event"
        title={`Konten Statis ${data.event.name}`}
        description="Kelola halaman Landing, Syarat & Ketentuan, Privacy Policy, dan informasi publik lainnya."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total Laman" value={String(data.summary.total)} />
        <SummaryCard label="Publish" value={String(data.summary.publishedCount)} />
        <SummaryCard label="Draft" value={String(data.summary.draftCount)} />
      </div>

      <PageDashboard pages={data.pages} eventId={data.event.id} />
    </div>
  );
}
