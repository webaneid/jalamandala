import Link from "next/link";
import { notFound } from "next/navigation";

import { getEventContextBySlug, getPublishedEventAgendas } from "@/actions/public-pages";
import { PublicContainer } from "@/components/public/ui/PublicContainer";
import { getPublicButtonClassName } from "@/components/public/ui/PublicButton";
import { SectionHeader } from "@/components/public/ui/SectionHeader";

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
      groups.set(key, {
        key,
        label: formatAgendaDate(agenda.startAt),
        items: [],
      });
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

  if (!event) {
    notFound();
  }

  const agendas = await getPublishedEventAgendas(event.id);
  const agendaGroups = groupAgendasByDay(agendas);

  return (
    <section className="bg-white py-16 sm:py-20">
      <PublicContainer>
        <div className="mb-8">
          <Link
            href={`/${event.slug}`}
            className={getPublicButtonClassName({
              tone: "outline",
              className: "h-10 rounded-xl px-4 text-sm",
            })}
          >
            Kembali ke beranda
          </Link>
        </div>

        <SectionHeader
          eyebrow={event.name}
          title="Agenda Lengkap"
          description="Susunan agenda lengkap berdasarkan hari dan jam. Semua waktu menggunakan WIB."
        />

        <div className="mt-10 space-y-8">
          {agendaGroups.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-8 text-center text-slate-600">
              Agenda belum tersedia saat ini.
            </div>
          ) : (
            agendaGroups.map((group) => (
              <section
                key={group.key}
                className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.06)]"
              >
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                    {group.label}
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <thead className="bg-white text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="w-48 border-b border-slate-100 px-5 py-4 sm:px-6">Jam</th>
                        <th className="border-b border-slate-100 px-5 py-4 sm:px-6">Agenda</th>
                        <th className="w-64 border-b border-slate-100 px-5 py-4 sm:px-6">Lokasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.items.map((agenda) => {
                        const location = [agenda.venueName, agenda.stageName].filter(Boolean).join(" · ");
                        const speakers = Array.isArray(agenda.speakerNames)
                          ? agenda.speakerNames.filter(Boolean).join(", ")
                          : "";

                        return (
                          <tr key={agenda.id} className="align-top transition-colors hover:bg-slate-50/70">
                            <td className="px-5 py-5 text-sm font-semibold text-primary-700 sm:px-6">
                              {formatAgendaTimeRange(agenda.startAt, agenda.endAt)}
                            </td>
                            <td className="px-5 py-5 sm:px-6">
                              <h3 className="text-base font-semibold text-slate-950">{agenda.title}</h3>
                              {agenda.description ? (
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                  {agenda.description}
                                </p>
                              ) : null}
                              {speakers ? (
                                <p className="mt-3 text-sm font-medium text-slate-700">
                                  Narasumber: {speakers}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-5 py-5 text-sm leading-6 text-slate-600 sm:px-6">
                              {location || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )}
        </div>
      </PublicContainer>
    </section>
  );
}
