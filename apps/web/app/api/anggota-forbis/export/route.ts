import { and, asc, eq, ilike, or } from "drizzle-orm";
import * as XLSX from "xlsx";

import { db } from "@repo/db";
import { forbisMembers } from "@repo/db/schema/public";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const scope = searchParams.get("scope") ?? "all"; // "all" | "search"

  const filters = [eq(forbisMembers.isActive, true)];

  if (scope === "search" && query) {
    filters.push(
      or(
        ilike(forbisMembers.name, `%${query}%`),
        ilike(forbisMembers.email, `%${query}%`),
        ilike(forbisMembers.forbisMemberId, `%${query}%`),
        ilike(forbisMembers.phone, `%${query}%`),
        ilike(forbisMembers.companyName, `%${query}%`),
      )!
    );
  }

  const members = await db.query.forbisMembers.findMany({
    where: and(...filters),
    orderBy: (t) => [asc(t.name)],
  });

  const HEADERS = [
    "forbis_member_id",
    "name",
    "email",
    "phone",
    "whatsapp",
    "is_kmi_alumni",
    "kmi_year",
    "company_name",
    "booth_name",
    "requested_booth_category_slug",
    "company_description",
    "company_phone",
    "company_whatsapp",
    "company_address",
    "company_province_code",
    "company_province_name",
    "company_regency_code",
    "company_regency_name",
    "company_district_code",
    "company_district_name",
    "company_village_code",
    "company_village_name",
    "legal_entity",
    "business_category",
    "business_sector",
    "brand_name",
    "product_tags",
    "partnership_concepts",
  ];

  const rows = members.map((m) => [
    m.forbisMemberId ?? "",
    m.name,
    m.email ?? "",
    m.phone ?? "",
    m.whatsapp ?? "",
    m.isKmiAlumni ? "Ya" : "Tidak",
    m.kmiYear ?? "",
    m.companyName ?? "",
    m.boothName ?? "",
    m.requestedBoothCategorySlug ?? "",
    m.companyDescription ?? "",
    m.companyPhone ?? "",
    m.companyWhatsapp ?? "",
    m.companyAddress ?? "",
    m.companyProvinceCode ?? "",
    m.companyProvinceName ?? "",
    m.companyRegencyCode ?? "",
    m.companyRegencyName ?? "",
    m.companyDistrictCode ?? "",
    m.companyDistrictName ?? "",
    m.companyVillageCode ?? "",
    m.companyVillageName ?? "",
    m.legalEntity ?? "",
    m.businessCategory ?? "",
    m.businessSector ?? "",
    m.brandName ?? "",
    (m.productTags ?? []).join(","),
    (m.partnershipConcepts ?? []).join(","),
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
  ws["!cols"] = HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
  XLSX.utils.book_append_sheet(wb, ws, "forbis_members");

  const rawBuf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as number[];
  const buf = new Uint8Array(rawBuf).buffer;

  const date = new Date().toISOString().slice(0, 10);
  const filename = `anggota-forbis-${date}.xlsx`;

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
