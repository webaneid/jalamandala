import Link from "next/link";
import { notFound } from "next/navigation";

import { getEventContextBySlug, getPublishedEventAgendas } from "@/actions/public-pages";
import { PublicContainer } from "@/components/public/ui/PublicContainer";

const AGENDA_TIMEZONE = "Asia/Jakarta";

function formatAgendaDate(value: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    timeZone: AGENDA_TIMEZONE,
    weekday: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatAgendaTime(value: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: AGENDA_TIMEZONE,
  }).format(new Date(value));
}

function formatAgendaTimeRange(startAt: Date | string, endAt?: Date | string | null) {
  const start = formatAgendaTime(startAt);
  const end = endAt ? formatAgendaTime(endAt) : null;
  return `${start}${end ? ` - ${end}` : ""} WIB`;
}

function getAgendaDateKey(value: Date | string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: AGENDA_TIMEZONE,
    year: "numeric",
  }).format(new Date(value));
}

function groupAgendasByDay(agendas: any[]) {
  const groups = new Map<string, { key: string; label: string; items: any[] }>();
  for (const agenda of agendas) {
    const key = getAgendaDateKey(agenda.startAt);
    if (!groups.has(key)) {
      groups.set(key, { key, label: formatAgendaDate(agenda.startAt), items: [] });
    }
    groups.get(key)?.items.push(agenda);
  }
  return Array.from(groups.values());
}

export default async function PublicAgendaPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  const event = await getEventContextBySlug(eventSlug);
  if (!event) notFound();

  const agendas = await getPublishedEventAgendas(event.id);
  const agendaGroups = groupAgendasByDay(agendas);

  return (
    <section className="py-12">
      <PublicContainer>
        {/* Back */}
        <div className="mb-8">
          <Link
            href={`/${event.slug}`}
            className="inline-flex h-9 items-center rounded-xl border border-white/14 bg-white/6 px-4 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            ← Kembali ke beranda
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 space-y-2">
          <span className="inline-flex items-center rounded-full bg-[#00adee]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00adee]">
            {event.name}
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white">Agenda Lengkap</h1>
          <p className="text-sm text-white/50">
            Susunan agenda lengkap berdasarkan hari dan jam. Semua waktu menggunakan WIB.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-5">
          {agendaGroups.length === 0 ? (
            <div className="rounded-3xl border border-white/8 bg-white/5 p-8 text-center text-sm text-white/45">
              Agenda belum tersedia saat ini.
            </div>
          ) : (
            agendaGroups.map((group) => (
              <section
                key={group.key}
                className="overflow-hidden rounded-3xl border border-white/8 bg-white/4"
              >
                <div className="border-b border-white/8 bg-[#134397]/25 px-5 py-3">
                  <h2 className="text-base font-semibold text-white">{group.label}</h2>
                </div>

                <div className="divide-y divide-white/6">
                  {group.items.map((agenda) => {
                    const location = [agenda.venueName, agenda.stageName]
                      .filter(Boolean)
                      .join(" · ");
                    const speakers = Array.isArray(agenda.speakerNames)
                      ? agenda.speakerNames.filter(Boolean).join(", ")
                      : "";

                    return (
                      <div key={agenda.id} className="px-5 py-4">
                        <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                          <p className="shrink-0 text-sm font-semibold text-[#00adee] sm:w-36">
                            {formatAgendaTimeRange(agenda.startAt, agenda.endAt)}
                          </p>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-semibold text-white">{agenda.title}</p>
                            {agenda.description && (
                              <p className="text-sm leading-6 text-white/50">{agenda.description}</p>
                            )}
                            {speakers && (
                              <p className="text-xs font-medium text-white/40">
                                Narasumber: {speakers}
                              </p>
                            )}
                          </div>
                          {location && (
                            <p className="shrink-0 text-xs text-white/40 sm:w-36 sm:text-right">
                              {location}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </PublicContainer>
    </section>
  );
}
