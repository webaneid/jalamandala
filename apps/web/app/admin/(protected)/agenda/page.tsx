import { requireRoles } from "@/lib/admin-auth";
import { asc, eq } from "drizzle-orm";
import { CalendarDays } from "lucide-react";

import { db } from "@repo/db";
import { eventAgendas, expoEvents } from "@repo/db/schema/public";

import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AgendaDashboard } from "@/components/admin/agenda/AgendaDashboard";
import { Card, CardContent } from "@/components/ui/card";

async function getAgendaPageData() {
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

  const agendas = await db
    .select()
    .from(eventAgendas)
    .where(eq(eventAgendas.eventId, activeEvent.id))
    .orderBy(asc(eventAgendas.startAt), asc(eventAgendas.sortOrder), asc(eventAgendas.title));

  const publishedCount = agendas.filter((agenda) => agenda.status === "published").length;
  const draftCount = agendas.filter((agenda) => agenda.status === "draft").length;
  const uniqueDayCount = new Set(
    agendas.map((agenda) =>
      agenda.startAt.toLocaleDateString("en-CA", {
        timeZone: "Asia/Jakarta",
      })
    )
  ).size;

  return {
    agendas: agendas.map((agenda) => ({
      agendaType: agenda.agendaType,
      description: agenda.description,
      endAt: agenda.endAt ? agenda.endAt.toISOString() : null,
      id: agenda.id,
      isPublic: agenda.isPublic,
      slug: agenda.slug,
      sortOrder: agenda.sortOrder,
      speakerNames: agenda.speakerNames ?? [],
      stageName: agenda.stageName,
      startAt: agenda.startAt.toISOString(),
      status: agenda.status,
      title: agenda.title,
      venueName: agenda.venueName,
    })),
    event: {
      id: activeEvent.id,
      name: activeEvent.name,
    },
    summary: {
      draftCount,
      publishedCount,
      total: agendas.length,
      uniqueDayCount,
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
  title: "Agenda",
};

export default async function AgendaPage() {
  await requireRoles(["event_crew"]);
  const data = await getAgendaPageData();

  if (!data) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Agenda Event"
          title="Agenda belum bisa dimuat"
          description="Belum ada event aktif yang bisa dipakai sebagai konteks agenda."
        />

        <AdminEmptyState
          icon={CalendarDays}
          title="Event aktif belum ditemukan"
          description="Agenda ditempelkan ke event aktif. Pastikan minimal ada satu event aktif atau schema event yang sedang dipakai sudah benar."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Agenda Event"
        title={`Run-down ${data.event.name}`}
        description="Kelola agenda event secara hirarkis per hari dan per jam. Gunakan filter untuk fokus pada tanggal dan tipe agenda tertentu."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Agenda" value={String(data.summary.total)} />
        <SummaryCard label="Publish" value={String(data.summary.publishedCount)} />
        <SummaryCard label="Draft" value={String(data.summary.draftCount)} />
        <SummaryCard label="Hari Aktif" value={String(data.summary.uniqueDayCount)} />
      </div>

      <AgendaDashboard
        agendas={data.agendas}
        eventId={data.event.id}
        eventName={data.event.name}
      />
    </div>
  );
}
