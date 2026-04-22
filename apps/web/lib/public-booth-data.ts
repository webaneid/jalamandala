import { asc, eq } from "drizzle-orm"
import { createTenantDb } from "@repo/db"
import { eventAddons } from "@repo/db/schema/tenant"
import { isBoothEligible } from "@/lib/booth-eligibility"

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026"

const PRICE_PHASES = ["early_bird", "pre_sale", "regular"] as const

type PriceRule = {
  endsAt: Date | null
  price: number
  priceGroup: string
  pricePhase: string
  startsAt: Date | null
}

export type PublicBooth = {
  boothCategory: { id: string; name: string; slug: string }
  boothGroup: { defaultPriceGroup: string | null; id: string; name: string; slug: string }
  code: string
  facilities: string[]
  height: number | null
  id: string
  isAvailable: boolean
  isEligible: boolean
  name: string
  status: string
  width: number | null
  x: number | null
  y: number | null
}

export type PublicZoneData = {
  colorCode: string | null
  description: string | null
  facilities: string[]
  id: string
  imageAssetId: string | null
  isVertical: boolean
  location: string | null
  name: string
  price: number
  priceGroup: string
  pricePhase: string
  slug: string
  booths: PublicBooth[]
}

function resolvePriceGroup(orgSlug: string | null): string {
  switch (orgSlug) {
    case "forbis":
    case "fpag":
    case "formaqin":
      return "forbis"
    case "gontor":
      return "gontor"
    case "sponsor":
      return "sponsor"
    default:
      return "public"
  }
}

function resolvePrice(priceRules: PriceRule[], priceGroup: string) {
  if (priceGroup === "gontor") return { phase: "free", price: 0 }

  const now = new Date()

  for (const phase of PRICE_PHASES) {
    const rule = priceRules.find((r) => r.priceGroup === priceGroup && r.pricePhase === phase)
    if (!rule) continue
    if (!rule.startsAt && !rule.endsAt) continue

    const afterStart = !rule.startsAt || now >= rule.startsAt
    const beforeEnd = !rule.endsAt || now < rule.endsAt

    if (afterStart && beforeEnd) return { phase, price: rule.price }
  }

  const regular = priceRules.find((r) => r.priceGroup === priceGroup && r.pricePhase === "regular")
  return { phase: "regular", price: regular?.price ?? 0 }
}

const VERTICAL_ZONE_SLUGS = ["premium", "festival-west"]

export async function getPublicZoneForBooking(
  zoneSlug: string,
  participant: { organizationGroupSlug: string | null },
  business: { requestedBoothCategorySlug: string | null }
): Promise<PublicZoneData | null> {
  const tenantDb = await createTenantDb(TENANT_SCHEMA)

  const zone = await tenantDb.query.zones.findFirst({
    where: (t, { eq }) => eq(t.slug, zoneSlug),
    with: {
      priceRules: true,
      booths: {
        orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.code)],
        with: {
          boothCategory: true,
          boothGroup: true,
          facilities: { with: { facility: true } },
        },
      },
    },
  })

  if (!zone) return null

  const priceGroup = resolvePriceGroup(participant.organizationGroupSlug)
  const { phase, price } = resolvePrice(zone.priceRules, priceGroup)

  // Aggregate unique facilities across all booths
  const facilityMap = new Map<string, string>()
  for (const booth of zone.booths) {
    for (const f of booth.facilities) {
      const label = f.value ? `${f.facility.name}: ${f.value}` : f.facility.name
      facilityMap.set(label.toLowerCase(), label)
    }
  }

  const booths: PublicBooth[] = zone.booths.map((booth) => {
    const eligible = isBoothEligible({
      booth: { boothCategorySlug: booth.boothCategory.slug, boothGroupSlug: booth.boothGroup.slug },
      business: { requestedBoothCategorySlug: business.requestedBoothCategorySlug },
      participant: { organizationGroupSlug: participant.organizationGroupSlug },
    })
    const available = booth.status === "open"

    return {
      boothCategory: { id: booth.boothCategory.id, name: booth.boothCategory.name, slug: booth.boothCategory.slug },
      boothGroup: {
        defaultPriceGroup: booth.boothGroup.defaultPriceGroup,
        id: booth.boothGroup.id,
        name: booth.boothGroup.name,
        slug: booth.boothGroup.slug,
      },
      code: booth.code,
      facilities: booth.facilities.map((f) => f.value ? `${f.facility.name}: ${f.value}` : f.facility.name),
      height: booth.height,
      id: booth.id,
      isAvailable: available,
      isEligible: eligible,
      name: booth.name,
      status: booth.status,
      width: booth.width,
      x: booth.x,
      y: booth.y,
    }
  })

  return {
    colorCode: zone.colorCode,
    description: zone.description,
    facilities: [...facilityMap.values()],
    id: zone.id,
    imageAssetId: zone.imageAssetId,
    isVertical: VERTICAL_ZONE_SLUGS.includes(zoneSlug),
    location: zone.location,
    name: zone.name,
    price,
    priceGroup,
    pricePhase: phase,
    slug: zoneSlug,
    booths,
  }
}

export type PublicAddon = {
  description: string | null
  id: string
  name: string
  price: number
  unitName: string | null
}

export async function getPublicAddons(): Promise<PublicAddon[]> {
  const tenantDb = await createTenantDb(TENANT_SCHEMA)
  const rows = await tenantDb.query.eventAddons.findMany({
    where: eq(eventAddons.isActive, true),
    orderBy: [asc(eventAddons.sortOrder)],
    with: { addonUnit: true },
  })
  return rows.map((r) => ({
    description: r.description,
    id: r.id,
    name: r.name,
    price: r.price,
    unitName: r.addonUnit?.name ?? null,
  }))
}
