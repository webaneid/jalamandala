import Link from "next/link";
import { getPaidParticipantBusinessLogos, getPublishedEventAgendas, getPublicTenantZones } from "@/actions/public-pages";
import { PublicButton } from "@/components/public/ui/PublicButton";
import { PublicContainer } from "@/components/public/ui/PublicContainer";
import { SectionHeader } from "@/components/public/ui/SectionHeader";
import { FormSectionCard } from "@/components/public/ui/FormSectionCard";
import { StatusBadge } from "@/components/public/ui/StatusBadge";
import { getPublicButtonClassName } from "@/components/public/ui/PublicButton";
import { LogoMarquee } from "@/components/public/LogoMarquee";
import { getCurrentParticipantSession } from "@/lib/participant-session";

function normalizePayload<T = any>(payload: T): any {
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return {};
    }
  }

  return payload ?? {};
}

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

// Validasi fail-safe: jika required data kosong, kita bisa throw error agar dirender null oleh LandingRenderer.

export function HeroBlock({
  payload,
  event,
  hasVisibleAgendaBlock = false,
}: {
  payload: any;
  event: any;
  hasVisibleAgendaBlock?: boolean;
}) {
  const normalizedPayload = normalizePayload(payload);
  const title = normalizedPayload?.title ?? event?.name ?? null;
  const subtitle = normalizedPayload?.subtitle ?? normalizedPayload?.description ?? null;
  const eyebrow = normalizedPayload?.eyebrow ?? event?.name ?? null;
  const dateLabel = normalizedPayload?.dateLabel ?? null;
  const highlightWord = normalizedPayload?.highlightWord ?? null;
  const heroImageSrc = normalizedPayload?.heroImage ?? (normalizedPayload?.heroImageAssetId ? `/api/media/${normalizedPayload.heroImageAssetId}` : null);
  const primaryCtaLabel = normalizedPayload?.primaryCtaLabel ?? normalizedPayload?.cta_text ?? "Amankan Booth Anda";
  const primaryCtaHref = normalizedPayload?.primaryCtaHref ?? normalizedPayload?.cta_link ?? `/${event?.slug ?? ""}/login`;
  const secondaryCtaLabel = normalizedPayload?.secondaryCtaLabel ?? "Lihat Agenda";
  const secondaryCtaHref = normalizedPayload?.secondaryCtaHref ?? "#agenda";
  
  if (!title) throw new Error("HeroBlock: missing title");

  // Jika ada highlightWord, bungkus kata tersebut di dalam span berwarna accent
  function renderTitle() {
    if (highlightWord && title.includes(highlightWord)) {
      const parts = title.split(highlightWord);
      return (
        <>
          {parts[0]}
          <span className="text-[#00adee]">{highlightWord}</span>
          {parts.slice(1).join(highlightWord)}
        </>
      );
    }
    return title;
  }

  return (
    <section className="relative overflow-hidden">
      <PublicContainer>
        <div className="grid grid-cols-1 items-center gap-12 py-16 sm:py-20 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16 lg:py-28">
          {/* Left: Text content */}
          <div className="flex flex-col items-start">
            {(eyebrow || dateLabel) && (
              <div className="mb-6 flex flex-wrap gap-3">
                {eyebrow ? <StatusBadge tone="brand">{eyebrow}</StatusBadge> : null}
                {dateLabel ? <StatusBadge tone="info">{dateLabel}</StatusBadge> : null}
              </div>
            )}

            <h1 className="text-4xl font-extrabold leading-[1.04] tracking-[-0.08em] text-[#0f172a] sm:text-5xl lg:text-[4.5rem] lg:leading-none lg:tracking-[-3px]">
              {renderTitle()}
            </h1>

            {subtitle && (
              <p className="mt-6 max-w-lg text-base leading-7 text-[#64748b] sm:text-lg sm:leading-8">
                {subtitle}
              </p>
            )}

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href={primaryCtaHref}
                className={getPublicButtonClassName({
                  emphasis: "hero",
                  className: "h-12 px-8 text-base",
                })}
              >
                {primaryCtaLabel}
              </Link>
              {hasVisibleAgendaBlock ? (
                <Link
                  href={secondaryCtaHref}
                  className={getPublicButtonClassName({
                    tone: "outline",
                    className: "h-12 border-[#e2e8f0] bg-white/60 px-8 text-base text-[#0f172a] hover:bg-white hover:border-[#c6d4e9]",
                  })}
                >
                  {secondaryCtaLabel}
                </Link>
              ) : null}
            </div>
          </div>

          {/* Right: Image area — bersih, tanpa dekorasi */}
          <div>
            {heroImageSrc ? (
              <img
                src={heroImageSrc}
                alt={title}
                className="h-auto w-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center" style={{ aspectRatio: "4/3" }}>
                <svg className="size-16 text-[#c6d4e9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Zm16.5-13.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}

export function ProblemStatementBlock({ payload }: { payload: any }) {
  const normalizedPayload = normalizePayload(payload);
  const title = normalizedPayload?.sectionTitle ?? normalizedPayload?.title ?? null;
  const eyebrow = normalizedPayload?.sectionEyebrow ?? normalizedPayload?.eyebrow ?? null;
  const description = normalizedPayload?.description ?? null;
  const items = Array.isArray(normalizedPayload?.items) ? normalizedPayload.items : [];
  if (!title && !description && items.length === 0) throw new Error("ProblemStatementBlock: empty payload");

  return (
    <section className="bg-white py-16 sm:py-20">
      <PublicContainer>
        <div className="space-y-10">
          <SectionHeader
            align="left"
            eyebrow={eyebrow}
            title={title ?? "Mengapa Kita Ada Di Sini?"}
            description={description}
          />
          {items.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
              {items.map((item: any, index: number) => (
                <FormSectionCard
                  key={`${item.title ?? item.name ?? "problem"}-${index}`}
                  className="h-full rounded-[1.75rem] border-border/70 shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
                  contentClassName="space-y-3"
                >
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                    <span className="text-sm font-bold">{index + 1}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{item.title ?? item.name ?? `Poin ${index + 1}`}</h3>
                  {item.description ? <p className="text-sm leading-6 text-muted-foreground">{item.description}</p> : null}
                </FormSectionCard>
              ))}
            </div>
          ) : null}
        </div>
      </PublicContainer>
    </section>
  );
}

export function HighlightCardsBlock({ payload }: { payload: any }) {
  const normalizedPayload = normalizePayload(payload);

  const sectionEyebrow = normalizedPayload?.sectionEyebrow ?? normalizedPayload?.eyebrow ?? null;
  const sectionTitle = normalizedPayload?.sectionTitle ?? normalizedPayload?.title ?? null;
  const sectionDescription = normalizedPayload?.sectionDescription ?? normalizedPayload?.description ?? null;
  const cards = Array.isArray(normalizedPayload?.items)
    ? normalizedPayload.items
    : Array.isArray(normalizedPayload?.cards)
      ? normalizedPayload.cards
      : Array.isArray(normalizedPayload?.zones)
        ? normalizedPayload.zones
        : [];

  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-16 sm:py-20">
      <PublicContainer>
        <div className="space-y-12">
          {(sectionEyebrow || sectionTitle || sectionDescription) ? (
            <SectionHeader
              eyebrow={sectionEyebrow}
              title={sectionTitle ?? "Highlight"}
              description={sectionDescription}
            />
          ) : null}
          <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
            {cards.map((card: any, idx: number) => {
              const isFeatured = idx === 0;
              return (
                <article
                  key={idx}
                  className={[
                    "group flex min-h-[340px] flex-col rounded-[1.75rem] border p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(15,23,42,0.12)]",
                    isFeatured
                      ? "border-primary-900 bg-primary-900 text-white"
                      : "border-slate-100 bg-white text-slate-950",
                  ].join(" ")}
                >
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_16px_40px_rgba(19,67,151,0.24)] transition-transform duration-300 group-hover:scale-110">
                    <span className="text-lg font-bold">{idx + 1}</span>
                  </div>
                  <div className="mt-auto space-y-3 pt-16">
                    <h3 className={isFeatured ? "text-xl font-semibold text-white" : "text-xl font-semibold text-slate-950"}>
                      {card.title ?? card.name ?? `Item ${idx + 1}`}
                    </h3>
                    {card.description ? (
                      <p className={isFeatured ? "leading-7 text-white/78" : "leading-7 text-slate-600"}>
                        {card.description}
                      </p>
                    ) : null}
                    {Array.isArray(card.points) && card.points.length > 0 ? (
                      <ul className={isFeatured ? "mt-5 space-y-2 text-sm font-medium text-white/80" : "mt-5 space-y-2 text-sm font-medium text-slate-700"}>
                        {card.points.map((point: string, pointIndex: number) => (
                          <li key={`${idx}-${pointIndex}`} className="flex items-start gap-2">
                            <span className={isFeatured ? "mt-1.5 size-1.5 rounded-full bg-white/70" : "mt-1.5 size-1.5 rounded-full bg-secondary"} />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}

export function MomentumBannerBlock({ payload }: { payload: any }) {
  const normalizedPayload = normalizePayload(payload);
  const title = normalizedPayload?.title ?? "Momentum 100 Tahun Gontor";
  const description =
    normalizedPayload?.description ??
    "Momen emas ini hanya terjadi sekali seumur hidup. Saatnya kita membangun fondasi ekosistem ekonomi untuk masa depan santri.";
  const statTitle = normalizedPayload?.statTitle ?? "1926 - 2026";
  const statLabel = normalizedPayload?.statLabel ?? "A Century of Legacy";

  return (
    <section className="bg-white py-6 sm:py-8">
      <PublicContainer>
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-primary to-primary-800 p-6 text-white shadow-[0_28px_90px_rgba(19,67,151,0.24)] md:p-10">
          <div className="absolute -right-12 -top-12 opacity-10">
            <svg className="size-64" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3 3.5 10.5 12 21l8.5-10.5L12 3Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M3.5 10.5h17M8 10.5 12 3l4 7.5M8 10.5l4 10.5 4-10.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="md:w-2/3">
              <h3 className="text-xl font-extrabold text-accent-100 md:text-3xl">{title}</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-primary-50 md:text-base">{description}</p>
            </div>
            <div className="w-full rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-center backdrop-blur-md md:w-auto">
              <span className="mb-1 block text-3xl font-black text-white">{statTitle}</span>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-accent-100">{statLabel}</span>
            </div>
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}

export async function AgendaPreviewBlock({ payload, event }: { payload: any, event: any }) {
  const normalizedPayload = normalizePayload(payload);
  const title = normalizedPayload?.sectionTitle ?? normalizedPayload?.title ?? "Agenda Acara";
  const eyebrow = normalizedPayload?.sectionEyebrow ?? normalizedPayload?.eyebrow ?? null;
  const description =
    normalizedPayload?.sectionDescription ??
    normalizedPayload?.description ??
    "Ringkasan kegiatan utama selama expo. Agenda lengkap tersedia di halaman khusus.";
  const mode = normalizedPayload?.mode ?? "linked_agenda";
  const manualText = normalizedPayload?.manual_text ?? normalizedPayload?.manualText ?? null;
  const itemLimit = normalizedPayload?.itemLimit ?? 18;
  const dayLimit = normalizedPayload?.dayLimit ?? 2;
  const itemsPerDay = normalizedPayload?.itemsPerDay ?? 3;
  
  let agendas: any[] = [];
  if (mode === "linked_agenda" && event?.id) {
    agendas = await getPublishedEventAgendas(event.id, itemLimit);
  }

  const agendaGroups = groupAgendasByDay(agendas);
  const previewGroups = agendaGroups.slice(0, dayLimit).map((group) => ({
    ...group,
    items: group.items.slice(0, itemsPerDay),
  }));
  const hasHiddenItems =
    agendaGroups.length > dayLimit ||
    agendaGroups.some((group) => group.items.length > itemsPerDay);
  
  return (
    <section id="agenda" className="border-y border-slate-100 bg-white py-16 sm:py-20">
      <PublicContainer>
        <SectionHeader align="center" eyebrow={eyebrow} title={title} description={description} />
        
        {mode === "manual" ? (
          <div className="prose prose-slate mx-auto mt-10 max-w-2xl text-center">
            <p>{manualText}</p>
          </div>
        ) : (
          <div className="mt-10">
            {agendas.length === 0 ? (
              <FormSectionCard className="text-center italic text-slate-500">
                [Agenda belum tersedia saat ini]
              </FormSectionCard>
            ) : (
              <div className="relative">
                <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
                  <div className="divide-y divide-slate-100">
                    {previewGroups.map((group) => (
                      <div key={group.key} className="grid gap-0 md:grid-cols-[15rem_minmax(0,1fr)]">
                        <div className="border-b border-slate-100 bg-slate-50/80 p-5 md:border-b-0 md:border-r">
                          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-primary-600">
                            Hari
                          </p>
                          <h3 className="mt-2 text-lg font-semibold leading-snug text-slate-950">
                            {group.label}
                          </h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {group.items.map((agenda) => (
                            <div key={agenda.id} className="p-5 transition-colors hover:bg-slate-50/70">
                              <h4 className="text-base font-semibold text-slate-950">{agenda.title}</h4>
                              {agenda.description ? (
                                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                                  {agenda.description}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {hasHiddenItems ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 rounded-b-[2rem] bg-gradient-to-t from-white via-white/92 to-transparent" />
                ) : null}
                <div className="mt-8 flex justify-center">
                  <Link
                    href={`/${event?.slug ?? ""}/agenda`}
                    className={getPublicButtonClassName({
                      className: "h-12 px-8",
                    })}
                  >
                    Tampilkan lebih
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </PublicContainer>
    </section>
  );
}

export async function LogoSliderBlock({ payload }: { payload: any }) {
  const normalizedPayload = normalizePayload(payload);
  const title = normalizedPayload?.title ?? null;
  const source = normalizedPayload?.source ?? "mixed";
  const customLogos = Array.isArray(normalizedPayload?.customLogos)
    ? normalizedPayload.customLogos
        .filter((logo: any) => logo?.id || logo?.url)
        .map((logo: any) => ({
          id: logo.id || logo.url,
          label: logo.label || logo.fileName || "Logo partner",
          url: logo.url || `/api/media/${logo.id}`,
          alt: logo.label || logo.fileName || "Logo partner",
          source: "custom" as const,
        }))
    : [];
  const paidLogos = source === "custom" ? [] : await getPaidParticipantBusinessLogos(40);
  const logos = source === "paid_participants" ? paidLogos : [...paidLogos, ...customLogos];
  const uniqueLogos = Array.from(new Map(logos.map((logo) => [logo.id, logo])).values());

  if (uniqueLogos.length === 0) return null;

  return (
    <section className="bg-white py-10 sm:py-12">
      <PublicContainer>
        {title ? (
          <p className="mb-6 text-center text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {title}
          </p>
        ) : null}
        <LogoMarquee logos={uniqueLogos} />
      </PublicContainer>
    </section>
  );
}

function formatCurrency(value?: number | null) {
  if (!value) return "-";
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatPriceRange(priceMin?: number | null, priceMax?: number | null) {
  if (!priceMin && !priceMax) return "-";
  if (!priceMax || priceMin === priceMax) return formatCurrency(priceMin ?? priceMax);
  return `${formatCurrency(priceMin)} - ${formatCurrency(priceMax)}`;
}

export async function TenantZonesBlock({ payload, event }: { payload: any; event: any }) {
  const normalizedPayload = normalizePayload(payload);
  const eyebrow = normalizedPayload?.eyebrow ?? "Pendaftaran Tenant Expo";
  const title = normalizedPayload?.title ?? "Pilih Zona Bisnis Anda";
  const description =
    normalizedPayload?.description ??
    "Pilih dari 140+ titik strategis yang tersebar di 5 Zona Expo. Raih exposure terhadap 12.500+ pengunjung dan jejaring ekosistem Gontor.";
  const zones = await getPublicTenantZones();
  const session = await getCurrentParticipantSession();
  const eventSlug = event?.slug ?? "";
  const isLoggedIn = Boolean(session && eventSlug && session.eventSlug === eventSlug);

  if (zones.length === 0) return null;

  return (
    <section id="tenant" className="bg-slate-950 py-16 text-white sm:py-20">
      <PublicContainer>
        <div className="space-y-12">
          <SectionHeader
            align="center"
            eyebrow={eyebrow}
            title={title}
            description={description}
            className="[&_h2]:text-white [&_p]:text-slate-400 [&_p:first-child]:text-accent-100"
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {zones.map((zone, index) => {
              const imageSrc = zone.imageAssetId ? `/api/media/${zone.imageAssetId}` : null;
              const bookingHref = eventSlug ? `/${eventSlug}/booking?zone=${encodeURIComponent(zone.slug)}` : "#";
              const authHref = eventSlug
                ? `/${eventSlug}/login?next=${encodeURIComponent(bookingHref)}`
                : "#";
              return (
                <article
                  key={zone.id}
                  className="group flex overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-900 shadow-[0_28px_90px_rgba(0,0,0,0.24)]"
                >
                  <div className="flex w-full flex-col">
                    <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br from-slate-800 to-primary-900">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={zone.name}
                          className="absolute inset-0 h-full w-full object-cover opacity-25 transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,173,238,0.2),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.25),rgba(19,67,151,0.22))]" />
                      )}
                      <div className="relative z-10 flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-accent-100 backdrop-blur-sm">
                        <svg className="size-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M4 10.5 12 4l8 6.5V20H4V10.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                          <path d="M9 20v-6h6v6M7.5 11.5h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-xl font-bold text-white">{zone.name}</h3>
                      <p className="mt-1 text-xs text-slate-400">{zone.location || zone.description || "Area tenant FORBIS Expo"}</p>
                      <div className="my-4 space-y-3 border-b border-slate-800 pb-4 text-sm">
                        <span className="block text-slate-300">{zone.boothCount} booth tersedia</span>
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-bold text-accent-100">
                            {formatPriceRange(zone.priceMin, zone.priceMax)}
                          </span>
                          <span className="text-right font-bold text-slate-500">
                            {zone.activePricePhaseLabel}
                          </span>
                        </div>
                      </div>
                      <ul className="mb-6 flex-grow space-y-2 text-xs text-slate-400">
                        {(zone.facilities.length > 0 ? zone.facilities : ["Lokasi strategis", "Akses pengunjung", "Fasilitas tenant"]).map((facility) => (
                          <li key={facility}>• {facility}</li>
                        ))}
                      </ul>
                      <Link
                        href={isLoggedIn ? bookingHref : authHref}
                        className={getPublicButtonClassName({
                          tone: index === 0 ? "primary" : "outline",
                          className: index === 0
                            ? "h-11 rounded-xl text-sm"
                            : "h-11 rounded-xl border-slate-700 bg-slate-800 text-sm text-white hover:bg-slate-700 hover:text-white",
                        })}
                      >
                        Booking {zone.name}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}

export function CtaBannerBlock({ payload }: { payload: any }) {
  const normalizedPayload = normalizePayload(payload);
  const title = normalizedPayload?.title ?? null;
  const subtitle = normalizedPayload?.subtitle ?? normalizedPayload?.description ?? null;
  const ctaText = normalizedPayload?.cta_text ?? normalizedPayload?.buttonLabel ?? null;
  const ctaLink = normalizedPayload?.cta_link ?? normalizedPayload?.buttonHref ?? "#";
  if (!title) throw new Error("CtaBannerBlock: missing title");

  return (
    <section className="py-12 sm:py-16">
      <PublicContainer>
        <div className="rounded-[2rem] bg-gradient-to-r from-primary to-primary-800 p-8 text-center text-white shadow-[0_24px_80px_rgba(19,67,151,0.24)] sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
          {subtitle ? <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-blue-100">{subtitle}</p> : null}
          {ctaText ? (
            <div className="mt-8">
              <Link
                href={ctaLink}
                className={getPublicButtonClassName({
                  tone: "secondary",
                  className: "h-9 px-8",
                })}
              >
                {ctaText}
              </Link>
            </div>
          ) : null}
        </div>
      </PublicContainer>
    </section>
  );
}

export function TenantCtaBlock({ payload }: { payload: any }) {
  const normalizedPayload = normalizePayload(payload);
  const title = normalizedPayload?.title ?? null;
  const description = normalizedPayload?.description ?? null;
  const ctaText = normalizedPayload?.cta_text ?? normalizedPayload?.buttonLabel ?? null;
  const ctaLink = normalizedPayload?.cta_link ?? normalizedPayload?.buttonHref ?? "#";
  if (!title) throw new Error("TenantCtaBlock: missing title");

  return (
    <section className="bg-muted/55 py-16 sm:py-20">
      <PublicContainer>
        <FormSectionCard className="rounded-[2rem] text-center" contentClassName="space-y-5 py-10 sm:py-12">
          <StatusBadge tone="brand" className="mx-auto">Booth & Tenant</StatusBadge>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
          {description ? <p className="mx-auto max-w-2xl text-lg text-slate-600">{description}</p> : null}
          {ctaText ? (
            <div className="flex justify-center">
              <Link
                href={ctaLink}
                className={getPublicButtonClassName({
                  className: "h-9 px-8",
                })}
              >
                {ctaText}
              </Link>
            </div>
          ) : null}
        </FormSectionCard>
      </PublicContainer>
    </section>
  );
}

export function FaqBlock({ payload }: { payload: any }) {
  const normalizedPayload = normalizePayload(payload);
  const eyebrow = normalizedPayload?.sectionEyebrow ?? normalizedPayload?.eyebrow ?? null;
  const title = normalizedPayload?.sectionTitle ?? normalizedPayload?.title ?? "Tanya Jawab (FAQ)";
  const faqs = Array.isArray(normalizedPayload?.items)
    ? normalizedPayload.items
    : Array.isArray(normalizedPayload?.faqs)
      ? normalizedPayload.faqs
      : [];
  if (faqs.length === 0) return null;

  return (
    <section className="bg-white py-20 sm:py-24">
      <PublicContainer>
        <SectionHeader align="center" eyebrow={eyebrow} title={title} />
        <div className="mt-10 space-y-4">
          {faqs.map((faq: any, idx: number) => (
            <FormSectionCard key={idx} className="rounded-[1.5rem] bg-muted/50 shadow-none">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{faq.question}</h3>
              <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
            </FormSectionCard>
          ))}
        </div>
      </PublicContainer>
    </section>
  );
}

export function FooterInfoBlock({ payload, event }: { payload: any, event: any }) {
  const normalizedPayload = normalizePayload(payload);
  const address = normalizedPayload?.address ?? normalizedPayload?.locationValue ?? null;
  const email = normalizedPayload?.email ?? null;
  const phone = normalizedPayload?.phone ?? normalizedPayload?.contactValue ?? null;

  return (
    <footer className="bg-slate-950 py-16 text-slate-400">
      <PublicContainer className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <h3 className="text-white font-semibold text-lg mb-4">{event?.name || "Event Name"}</h3>
          {address && <p className="max-w-xs">{address}</p>}
        </div>
        <div className="md:text-right">
          <h4 className="text-white font-semibold mb-4">Kontak Kami</h4>
          {email && <p><a href={`mailto:${email}`} className="hover:text-white transition">{email}</a></p>}
          {phone && <p className="mt-2"><a href={`tel:${phone}`} className="hover:text-white transition">{phone}</a></p>}
        </div>
      </PublicContainer>
      <PublicContainer className="mt-16 border-t border-slate-800 pt-8 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} {event?.name || "Event"}. Hak Cipta Dilindungi.</p>
      </PublicContainer>
    </footer>
  );
}
