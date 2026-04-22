export type PricePhase = "early_bird" | "pre_sale" | "regular";

export const PRICE_PHASE_LABELS: Record<PricePhase, string> = {
  early_bird: "Early Bird",
  pre_sale: "Pre-Sale",
  regular: "Regular",
};

export type PricePhaseRule = {
  pricePhase: string;
  startsAt: string | Date | null;
  endsAt: string | Date | null;
};

// Server-side: resolves active phase from zone price rules using UTC comparison.
// All timestamps from DB are UTC. new Date() on server is UTC.
export function resolveCurrentPricePhase(rules: PricePhaseRule[]): PricePhase {
  const now = new Date();

  for (const phase of ["early_bird", "pre_sale", "regular"] as const) {
    const rule = rules.find((r) => r.pricePhase === phase);
    if (!rule) continue;

    const startsAt = rule.startsAt ? new Date(rule.startsAt) : null;
    const endsAt = rule.endsAt ? new Date(rule.endsAt) : null;

    // Skip if neither date is set — no schedule configured for this phase
    if (!startsAt && !endsAt) continue;

    const afterStart = !startsAt || now >= startsAt;
    const beforeEnd = !endsAt || now < endsAt;

    if (afterStart && beforeEnd) return phase;
  }

  return "regular";
}

// Client/server: Convert UTC ISO string to WIB datetime-local input value (YYYY-MM-DDTHH:mm).
export function utcToWibInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  // UTC+7
  const wibMs = date.getTime() + 7 * 60 * 60 * 1000;
  const wib = new Date(wibMs);
  const year = wib.getUTCFullYear();
  const month = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wib.getUTCDate()).padStart(2, "0");
  const hours = String(wib.getUTCHours()).padStart(2, "0");
  const minutes = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Server action side: parse datetime-local value as WIB, return UTC Date.
export function wibInputToDate(value: string | null | undefined): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  // Treat input as WIB (UTC+7) regardless of server timezone
  const parsed = new Date(`${trimmed}:00+07:00`);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}
