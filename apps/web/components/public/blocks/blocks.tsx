import { ZonePreviewButton } from "@/components/public/ZonePreviewModal";
import { GalleryGridClient } from "./GalleryGridClient";
import Link from "next/link";
import { getPaidParticipantBusinessLogos, getPublishedEventAgendas, getPublicTenantZones } from "@/actions/public-pages";
import { PublicContainer } from "@/components/public/ui/PublicContainer";
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
      groups.set(key, { key, label: formatAgendaDate(agenda.startAt), items: [] });
    }
    groups.get(key)?.items.push(agenda);
  }
  return Array.from(groups.values());
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

/* ── Chip / badge kecil ── */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#00adee]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00adee]">
      {children}
    </span>
  );
}

/* ── Section wrapper tipis ── */
function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`py-5 sm:py-14 ${className}`}>
      <PublicContainer>{children}</PublicContainer>
    </section>
  );
}

/* ── Card dark ── */
function DarkCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-white/8 bg-white/5 p-6 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────
export function HeroBlock({
  payload,
  event,
  hasVisibleAgendaBlock = false,
}: {
  payload: any;
  event: any;
  hasVisibleAgendaBlock?: boolean;
}) {
  const p = normalizePayload(payload);
  const title = p?.title ?? event?.name ?? null;
  const subtitle = p?.subtitle ?? p?.description ?? null;
  const eyebrow = p?.eyebrow ?? event?.name ?? null;
  const dateLabel = p?.dateLabel ?? null;
  const highlightWord = p?.highlightWord ?? null;
  const heroImageSrc =
    p?.heroImage ?? (p?.heroImageAssetId ? `/api/media/${p.heroImageAssetId}` : null);
  const primaryCtaLabel = p?.primaryCtaLabel ?? p?.cta_text ?? "Amankan Booth Anda";
  const primaryCtaHref =
    p?.primaryCtaHref ?? p?.cta_link ?? `/${event?.slug ?? ""}/login`;
  const secondaryCtaLabel = p?.secondaryCtaLabel ?? "Lihat Agenda";
  const secondaryCtaHref = p?.secondaryCtaHref ?? "#agenda";

  if (!title) throw new Error("HeroBlock: missing title");

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
    <section className="relative overflow-hidden pb-8 pt-5 sm:pb-16 sm:pt-14">
      <PublicContainer>
        {/* Eyebrow chips */}
        {(eyebrow || dateLabel) && (
          <div className="mb-7 flex flex-wrap gap-2">
            {eyebrow ? <Chip>{eyebrow}</Chip> : null}
            {dateLabel ? (
              <span className="inline-flex items-center rounded-full border border-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                {dateLabel}
              </span>
            ) : null}
          </div>
        )}

        {/* Hero image */}
        {heroImageSrc && (
          <div className="mb-8 overflow-hidden rounded-3xl">
            <img
              src={heroImageSrc}
              alt={title}
              className="h-auto w-full object-cover"
              style={{ maxHeight: 340 }}
            />
          </div>
        )}

        {/* Title */}
        <h1 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl">
          {renderTitle()}
        </h1>

        {subtitle && (
          <p className="mt-5 text-base leading-7 text-white/55 sm:text-lg">
            {subtitle}
          </p>
        )}

        {/* CTAs */}
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href={primaryCtaHref}
            className="flex h-12 items-center justify-center rounded-2xl bg-[#00adee] px-8 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(0,173,238,0.30)] transition hover:brightness-110 active:scale-95"
          >
            {primaryCtaLabel}
          </Link>
          {hasVisibleAgendaBlock && (
            <Link
              href={secondaryCtaHref}
              className="flex h-12 items-center justify-center rounded-2xl border border-white/14 bg-white/6 px-8 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white active:scale-95"
            >
              {secondaryCtaLabel}
            </Link>
          )}
        </div>
      </PublicContainer>
    </section>
  );
}

// ─────────────────────────────────────────────
// PROBLEM STATEMENT
// ─────────────────────────────────────────────
export function ProblemStatementBlock({ payload }: { payload: any }) {
  const p = normalizePayload(payload);
  const title = p?.sectionTitle ?? p?.title ?? null;
  const eyebrow = p?.sectionEyebrow ?? p?.eyebrow ?? null;
  const description = p?.description ?? null;
  const items = Array.isArray(p?.items) ? p.items : [];
  if (!title && !description && items.length === 0)
    throw new Error("ProblemStatementBlock: empty payload");

  return (
    <Section>
      <div className="space-y-3">
        {eyebrow ? <Chip>{eyebrow}</Chip> : null}
        {title && (
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
        )}
        {description && <p className="text-sm leading-7 text-white/55">{description}</p>}
      </div>

      {items.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {items.map((item: any, idx: number) => (
            <DarkCard key={idx}>
              <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-[#134397]/60 text-[#00adee]">
                <span className="text-sm font-bold">{idx + 1}</span>
              </div>
              <h3 className="text-base font-semibold text-white">
                {item.title ?? item.name ?? `Poin ${idx + 1}`}
              </h3>
              {item.description && (
                <p className="mt-2 text-sm leading-6 text-white/50">{item.description}</p>
              )}
            </DarkCard>
          ))}
        </div>
      )}
    </Section>
  );
}

// ─────────────────────────────────────────────
// HIGHLIGHT CARDS
// ─────────────────────────────────────────────
export function HighlightCardsBlock({ payload }: { payload: any }) {
  const p = normalizePayload(payload);
  const eyebrow = p?.sectionEyebrow ?? p?.eyebrow ?? null;
  const title = p?.sectionTitle ?? p?.title ?? null;
  const description = p?.sectionDescription ?? p?.description ?? null;
  const cards = Array.isArray(p?.items)
    ? p.items
    : Array.isArray(p?.cards)
      ? p.cards
      : Array.isArray(p?.zones)
        ? p.zones
        : [];

  if (cards.length === 0) return null;

  return (
    <Section>
      {(eyebrow || title || description) && (
        <div className="mb-8 space-y-2">
          {eyebrow && <Chip>{eyebrow}</Chip>}
          {title && (
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {title}
            </h2>
          )}
          {description && <p className="text-sm leading-7 text-white/55">{description}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card: any, idx: number) => {
          const isFeatured = idx === 0;
          return (
            <div
              key={idx}
              className={[
                "flex flex-col rounded-3xl border p-6 transition",
                isFeatured
                  ? "border-[#134397] bg-[#134397]/70 shadow-[0_16px_48px_rgba(19,67,151,0.30)]"
                  : "border-white/8 bg-white/5",
              ].join(" ")}
            >
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#00adee]/15 text-[#00adee]">
                <span className="text-base font-bold">{idx + 1}</span>
              </div>
              <div className="mt-auto space-y-2 pt-12">
                <h3 className="text-base font-semibold text-white">
                  {card.title ?? card.name ?? `Item ${idx + 1}`}
                </h3>
                {card.description && (
                  <p className={`text-sm leading-6 ${isFeatured ? "text-white/70" : "text-white/50"}`}>
                    {card.description}
                  </p>
                )}
                {Array.isArray(card.points) && card.points.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {card.points.map((point: string, pi: number) => (
                      <li key={pi} className="flex items-start gap-2 text-sm text-white/60">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#00adee]" />
                        {point}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────
// MOMENTUM BANNER
// ─────────────────────────────────────────────
export function MomentumBannerBlock({ payload }: { payload: any }) {
  const p = normalizePayload(payload);
  const title = p?.title ?? "Momentum 100 Tahun Gontor";
  const description =
    p?.description ??
    "Momen emas ini hanya terjadi sekali seumur hidup. Saatnya kita membangun fondasi ekosistem ekonomi untuk masa depan santri.";
  const statTitle = p?.statTitle ?? "1926 - 2026";
  const statLabel = p?.statLabel ?? "A Century of Legacy";

  return (
    <section className="py-5">
      <PublicContainer>
        <div className="relative overflow-hidden rounded-3xl border border-[#134397]/60 bg-gradient-to-br from-[#134397] to-[#0d2e68] p-7 shadow-[0_20px_60px_rgba(19,67,151,0.30)]">
          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-8 -top-8 size-48 rounded-full bg-[#00adee]/10 blur-2xl" />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-[#00adee] sm:text-2xl">{title}</h3>
              <p className="max-w-sm text-sm leading-7 text-white/65">{description}</p>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-center backdrop-blur-sm">
              <span className="block text-2xl font-black text-white">{statTitle}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#00adee]">
                {statLabel}
              </span>
            </div>
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}

// ─────────────────────────────────────────────
// AGENDA PREVIEW
// ─────────────────────────────────────────────
export async function AgendaPreviewBlock({ payload, event }: { payload: any; event: any }) {
  const p = normalizePayload(payload);
  const title = p?.sectionTitle ?? p?.title ?? "Agenda Acara";
  const eyebrow = p?.sectionEyebrow ?? p?.eyebrow ?? null;
  const description =
    p?.sectionDescription ??
    p?.description ??
    "Ringkasan kegiatan utama selama expo.";
  const mode = p?.mode ?? "linked_agenda";
  const manualText = p?.manual_text ?? p?.manualText ?? null;
  const itemLimit = p?.itemLimit ?? 18;
  const dayLimit = p?.dayLimit ?? 2;
  const itemsPerDay = p?.itemsPerDay ?? 3;

  let agendas: any[] = [];
  if (mode === "linked_agenda" && event?.id) {
    agendas = await getPublishedEventAgendas(event.id, itemLimit);
  }

  const agendaGroups = groupAgendasByDay(agendas);
  const previewGroups = agendaGroups
    .slice(0, dayLimit)
    .map((group) => ({ ...group, items: group.items.slice(0, itemsPerDay) }));
  const hasHiddenItems =
    agendaGroups.length > dayLimit ||
    agendaGroups.some((group) => group.items.length > itemsPerDay);

  return (
    <Section id="agenda">
      <div className="mb-8 space-y-2">
        {eyebrow && <Chip>{eyebrow}</Chip>}
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
        {description && <p className="text-sm leading-7 text-white/55">{description}</p>}
      </div>

      {mode === "manual" ? (
        <DarkCard>
          <p className="text-sm text-white/60">{manualText}</p>
        </DarkCard>
      ) : agendas.length === 0 ? (
        <DarkCard>
          <p className="text-center text-sm italic text-white/40">
            Agenda belum tersedia saat ini
          </p>
        </DarkCard>
      ) : (
        <div className="relative">
          <div className="overflow-hidden rounded-3xl border border-white/8">
            {previewGroups.map((group, gi) => (
              <div
                key={group.key}
                className={gi > 0 ? "border-t border-white/8" : ""}
              >
                {/* Day header */}
                <div className="bg-[#134397]/30 px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-[#00adee]">
                    Hari
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-white">{group.label}</p>
                </div>
                {/* Items */}
                <div>
                  {group.items.map((agenda: any, ai: number) => (
                    <div
                      key={agenda.id}
                      className={[
                        "px-5 py-4",
                        ai > 0 ? "border-t border-white/6" : "",
                      ].join(" ")}
                    >
                      <p className="text-sm font-semibold text-white">{agenda.title}</p>
                      {agenda.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-white/45">
                          {agenda.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {hasHiddenItems && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-b-3xl bg-gradient-to-t from-[#04101f] to-transparent" />
          )}

          <div className="mt-6 flex justify-center">
            <Link
              href={`/${event?.slug ?? ""}/agenda`}
              className="flex h-11 items-center rounded-2xl border border-white/14 bg-white/6 px-7 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Tampilkan lebih
            </Link>
          </div>
        </div>
      )}
    </Section>
  );
}

// ─────────────────────────────────────────────
// LOGO SLIDER
// ─────────────────────────────────────────────
export async function LogoSliderBlock({ payload }: { payload: any }) {
  const p = normalizePayload(payload);
  const title = p?.title ?? null;
  const source = p?.source ?? "mixed";
  const customLogos = Array.isArray(p?.customLogos)
    ? p.customLogos
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
    <section className="py-5 sm:py-10">
      <PublicContainer>
        {title && (
          <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
            {title}
          </p>
        )}
        <LogoMarquee logos={uniqueLogos} />
      </PublicContainer>
    </section>
  );
}

// ─────────────────────────────────────────────
// TENANT ZONES
// ─────────────────────────────────────────────
export async function TenantZonesBlock({ payload, event }: { payload: any; event: any }) {
  const p = normalizePayload(payload);
  const eyebrow = p?.eyebrow ?? "Pendaftaran Tenant Expo";
  const title = p?.title ?? "Pilih Zona Bisnis Anda";
  const description =
    p?.description ??
    "Pilih dari titik strategis di 5 Zona Expo. Raih exposure terhadap ribuan pengunjung dan jejaring ekosistem Gontor.";
  const zones = await getPublicTenantZones();
  const session = await getCurrentParticipantSession();
  const eventSlug = event?.slug ?? "";
  const isLoggedIn = Boolean(session && eventSlug && session.eventSlug === eventSlug);

  if (zones.length === 0) return null;

  return (
    <Section id="tenant">
      <div className="mb-8 space-y-2">
        <Chip>{eyebrow}</Chip>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
        <p className="text-sm leading-7 text-white/55">{description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {zones.map((zone, idx) => {
          const imageSrc = zone.imageAssetId ? `/api/media/${zone.imageAssetId}` : null;
          const bookingHref = eventSlug
            ? `/${eventSlug}/booking?zone=${encodeURIComponent(zone.slug)}`
            : "#";
          const authHref = eventSlug
            ? `/${eventSlug}/login?next=${encodeURIComponent(bookingHref)}`
            : "#";
          const isFeatured = idx === 0;

          return (
            <article
              key={zone.id}
              className={[
                "flex flex-col overflow-hidden rounded-3xl border",
                isFeatured
                  ? "border-[#134397]/70 bg-[#134397]/40 shadow-[0_16px_48px_rgba(19,67,151,0.25)]"
                  : "border-white/8 bg-white/5",
              ].join(" ")}
            >
              {/* Zone image */}
              <div className="relative aspect-video overflow-hidden">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={zone.name}
                    className="h-full w-full object-cover opacity-70"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="h-full w-full"
                    style={{
                      background: zone.colorCode
                        ? `linear-gradient(135deg, ${zone.colorCode}40, ${zone.colorCode}15)`
                        : "linear-gradient(135deg, rgba(19,67,151,0.4), rgba(0,173,238,0.1))",
                    }}
                  />
                )}
                {/* Color dot */}
                {zone.colorCode && (
                  <span
                    className="absolute left-4 top-4 size-3 rounded-full border-2 border-white/40"
                    style={{ backgroundColor: zone.colorCode }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-base font-bold text-white">{zone.name}</h3>
                <p className="mt-0.5 text-xs text-white/45">
                  {zone.location || zone.description || "Area tenant FORBIS Expo"}
                </p>

                <div className="my-4 space-y-2 border-b border-white/8 pb-4">
                  <p className="text-xs text-white/50">{zone.boothCount} booth tersedia</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#00adee]">
                      {formatPriceRange(zone.priceMin, zone.priceMax)}
                    </span>
                    <span className="text-xs font-medium text-white/35">
                      {zone.activePricePhaseLabel}
                    </span>
                  </div>
                </div>

                <ul className="mb-5 flex-grow space-y-1.5">
                  {(zone.facilities.length > 0
                    ? zone.facilities
                    : ["Lokasi strategis", "Akses pengunjung", "Fasilitas tenant"]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-white/50">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#00adee]/60" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="flex gap-2">
                  <ZonePreviewButton zoneSlug={zone.slug} zoneName={zone.name} />
                  <Link
                    href={isLoggedIn ? bookingHref : authHref}
                    className={[
                      "flex flex-1 h-10 items-center justify-center rounded-2xl text-sm font-semibold transition active:scale-95",
                      isFeatured
                        ? "bg-[#00adee] text-white shadow-[0_6px_20px_rgba(0,173,238,0.30)] hover:brightness-110"
                        : "border border-white/14 bg-white/6 text-white/80 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                  >
                    Booking {zone.name}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────
// CTA BANNER
// ─────────────────────────────────────────────
export function CtaBannerBlock({ payload }: { payload: any }) {
  const p = normalizePayload(payload);
  const title = p?.title ?? null;
  const subtitle = p?.subtitle ?? p?.description ?? null;
  const ctaText = p?.cta_text ?? p?.buttonLabel ?? null;
  const ctaLink = p?.cta_link ?? p?.buttonHref ?? "#";
  if (!title) throw new Error("CtaBannerBlock: missing title");

  return (
    <section className="py-5 sm:py-6">
      <PublicContainer>
        <div className="relative overflow-hidden rounded-3xl border border-[#134397]/60 bg-gradient-to-br from-[#134397] to-[#0d2e68] p-8 text-center shadow-[0_20px_60px_rgba(19,67,151,0.28)]">
          <div className="pointer-events-none absolute -left-10 -top-10 size-52 rounded-full bg-[#00adee]/10 blur-3xl" />
          <div className="relative z-10 space-y-3">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">{title}</h2>
            {subtitle && <p className="mx-auto max-w-sm text-sm leading-7 text-white/60">{subtitle}</p>}
            {ctaText && (
              <div className="pt-2">
                <Link
                  href={ctaLink}
                  className="inline-flex h-11 items-center rounded-2xl bg-[#00adee] px-8 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(0,173,238,0.28)] transition hover:brightness-110 active:scale-95"
                >
                  {ctaText}
                </Link>
              </div>
            )}
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}

// ─────────────────────────────────────────────
// TENANT CTA
// ─────────────────────────────────────────────
export function TenantCtaBlock({ payload }: { payload: any }) {
  const p = normalizePayload(payload);
  const title = p?.title ?? null;
  const description = p?.description ?? null;
  const ctaText = p?.cta_text ?? p?.buttonLabel ?? null;
  const ctaLink = p?.cta_link ?? p?.buttonHref ?? "#";
  if (!title) throw new Error("TenantCtaBlock: missing title");

  return (
    <Section>
      <DarkCard className="text-center">
        <Chip>Booth & Tenant</Chip>
        <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">{title}</h2>
        {description && (
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/55">{description}</p>
        )}
        {ctaText && (
          <div className="mt-6">
            <Link
              href={ctaLink}
              className="inline-flex h-11 items-center rounded-2xl bg-[#00adee] px-8 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(0,173,238,0.28)] transition hover:brightness-110 active:scale-95"
            >
              {ctaText}
            </Link>
          </div>
        )}
      </DarkCard>
    </Section>
  );
}

// ─────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────
export function FaqBlock({ payload }: { payload: any }) {
  const p = normalizePayload(payload);
  const eyebrow = p?.sectionEyebrow ?? p?.eyebrow ?? null;
  const title = p?.sectionTitle ?? p?.title ?? "Tanya Jawab (FAQ)";
  const faqs = Array.isArray(p?.items)
    ? p.items
    : Array.isArray(p?.faqs)
      ? p.faqs
      : [];
  if (faqs.length === 0) return null;

  return (
    <Section>
      <div className="mb-8 space-y-2">
        {eyebrow && <Chip>{eyebrow}</Chip>}
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
      </div>
      <div className="space-y-3">
        {faqs.map((faq: any, idx: number) => (
          <DarkCard key={idx}>
            <h3 className="text-sm font-semibold text-white">{faq.question}</h3>
            <p className="mt-2 text-sm leading-6 text-white/55">{faq.answer}</p>
          </DarkCard>
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────
// FOOTER INFO
// ─────────────────────────────────────────────
export function FooterInfoBlock({ payload, event }: { payload: any; event: any }) {
  const p = normalizePayload(payload);
  const address = p?.address ?? p?.locationValue ?? null;
  const email = p?.email ?? null;
  const phone = p?.phone ?? p?.contactValue ?? null;

  return (
    <section className="border-t border-white/8 py-5 sm:py-12">
      <PublicContainer>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-white">{event?.name || "Event Name"}</h3>
            {address && <p className="mt-2 max-w-xs text-sm leading-6 text-white/45">{address}</p>}
          </div>
          <div className="sm:text-right">
            <h4 className="text-sm font-semibold text-white">Kontak Kami</h4>
            {email && (
              <p className="mt-2">
                <a href={`mailto:${email}`} className="text-sm text-white/45 transition hover:text-[#00adee]">
                  {email}
                </a>
              </p>
            )}
            {phone && (
              <p className="mt-1">
                <a href={`tel:${phone}`} className="text-sm text-white/45 transition hover:text-[#00adee]">
                  {phone}
                </a>
              </p>
            )}
          </div>
        </div>
        <div className="mt-10 border-t border-white/8 pt-6 text-center">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} {event?.name || "Event"}. Hak Cipta Dilindungi.
          </p>
        </div>
      </PublicContainer>
    </section>
  );
}

// ── Image Banner Block ───────────────────────���────────────────────────────────

export function ImageBannerBlock({ payload }: { payload: any }) {
  const p = normalizePayload(payload);
  const assetId: string | null = p?.assetId ?? null;
  const altText: string = p?.altText ?? "";
  const caption: string = p?.caption ?? "";

  if (!assetId) return null;

  return (
    <section className="w-full">
      <img
        src={`/api/media/${assetId}`}
        alt={altText}
        className="w-full object-cover"
        style={{ maxHeight: p?.maxHeight ? `${p.maxHeight}px` : undefined }}
      />
      {caption && (
        <div className="px-4 py-2 text-center text-xs text-white/40">{caption}</div>
      )}
    </section>
  );
}

// ── Gallery Block ───────────────────────────���───────────────────���─────────────

export function GalleryBlock({ payload }: { payload: any }) {
  const p = normalizePayload(payload);
  const images: Array<{ assetId: string; caption?: string }> = p?.images ?? [];
  if (!images.length) return null;

  return (
    <section className="py-5 sm:py-10">
      <PublicContainer>
        {p?.title && (
          <h2 className="mb-6 text-center text-2xl font-bold tracking-tight text-white">{p.title}</h2>
        )}
        <GalleryGridClient images={images} />
      </PublicContainer>
    </section>
  );
}


// ── Video Embed Block ���─────────────────────��───────────────────────────��──────

export function VideoEmbedBlock({ payload }: { payload: any }) {
  const p = normalizePayload(payload);
  const youtubeUrl: string = p?.youtubeUrl ?? "";
  if (!youtubeUrl) return null;

  // Extract video ID from various YouTube URL formats
  const videoId = youtubeUrl.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  )?.[1];
  if (!videoId) return null;

  return (
    <section className="py-5 sm:py-10">
      <PublicContainer>
        {p?.title && (
          <h2 className="mb-6 text-center text-2xl font-bold tracking-tight text-white">{p.title}</h2>
        )}
        {p?.description && (
          <p className="mb-6 text-center text-white/60">{p.description}</p>
        )}
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl" style={{ aspectRatio: "16/9" }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0`}
            title={p?.title ?? "Video"}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </PublicContainer>
    </section>
  );
}
