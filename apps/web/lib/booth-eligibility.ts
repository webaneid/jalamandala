// Aturan akses booth berdasarkan organisasi peserta dan kategori usaha.
// Dipakai di admin (ManualInvoiceBuilder) dan nanti participant self-booking.

// Mapping: org slug → booth group slug yang boleh dipesan
const BOOTH_GROUP_ACCESS: Record<string, string[]> = {
  forbis: ["general", "forbis"],
  fpag: ["fpag"],
  formaqin: ["formaqin"],
  general: ["general"],
  gontor: ["gontor"],
  sponsor: ["sponsor"],
};

// Booth kategori "free" selalu bisa dipesan oleh siapapun.
//
// Aturan per jenis produk usaha:
//   fnb_kitchen  → hanya booth fnb_kitchen atau free
//   fnb_dry_food → booth fnb_dry_food, fnb_kitchen, atau free
//                  (dry food lebih fleksibel — bisa pakai kitchen booth)
//   non_fnb      → hanya booth non_fnb atau free
//   free / null  → bisa ke booth apapun
function isBoothCategoryAllowed(
  requestedCategorySlug: string | null | undefined,
  boothCategorySlug: string
): boolean {
  if (boothCategorySlug === "free") return true;
  if (!requestedCategorySlug || requestedCategorySlug === "free") return true;

  switch (requestedCategorySlug) {
    case "fnb_kitchen":
      return boothCategorySlug === "fnb_kitchen";
    case "fnb_dry_food":
      return boothCategorySlug === "fnb_dry_food" || boothCategorySlug === "fnb_kitchen";
    default:
      return boothCategorySlug === requestedCategorySlug;
  }
}

export type BoothEligibilityInput = {
  booth: {
    boothCategorySlug: string;
    boothGroupSlug: string;
  };
  business: {
    requestedBoothCategorySlug: string | null | undefined;
  };
  participant: {
    organizationGroupSlug: string | null | undefined;
  };
};

export function isBoothEligible({
  booth,
  business,
  participant,
}: BoothEligibilityInput): boolean {
  const orgSlug = participant.organizationGroupSlug ?? "general";
  const allowedGroups = BOOTH_GROUP_ACCESS[orgSlug] ?? ["general"];

  if (!allowedGroups.includes(booth.boothGroupSlug)) return false;

  if (!isBoothCategoryAllowed(business.requestedBoothCategorySlug, booth.boothCategorySlug)) {
    return false;
  }

  return true;
}

export function getEligibilityRejectionReason({
  booth,
  business,
  participant,
}: BoothEligibilityInput): string | null {
  const orgSlug = participant.organizationGroupSlug ?? "general";
  const allowedGroups = BOOTH_GROUP_ACCESS[orgSlug] ?? ["general"];

  if (!allowedGroups.includes(booth.boothGroupSlug)) {
    return `Peserta dari organisasi ${orgSlug} tidak bisa memesan booth group ${booth.boothGroupSlug}.`;
  }

  if (!isBoothCategoryAllowed(business.requestedBoothCategorySlug, booth.boothCategorySlug)) {
    return `Kategori usaha ${business.requestedBoothCategorySlug ?? "tidak diketahui"} tidak cocok dengan booth kategori ${booth.boothCategorySlug}.`;
  }

  return null;
}
