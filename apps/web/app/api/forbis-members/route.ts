import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@repo/db";
import { forbisMembers, participants } from "@repo/db/schema/public";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  const filters = [eq(forbisMembers.isActive, true)];

  if (query) {
    filters.push(
      or(
        ilike(forbisMembers.name, `%${query}%`),
        ilike(forbisMembers.forbisMemberId, `%${query}%`),
        ilike(forbisMembers.phone, `%${query}%`),
        ilike(forbisMembers.whatsapp, `%${query}%`)
      )!
    );
  }

  const [members, registeredRows] = await Promise.all([
    db.query.forbisMembers.findMany({
      limit: 12,
      orderBy: (table, { asc }) => [asc(table.name), desc(table.updatedAt)],
      where: and(...filters),
    }),
    db
      .select({ forbisMemberId: participants.forbisMemberId, name: participants.name })
      .from(participants)
      .where(eq(participants.organizationGroupSlug, "forbis")),
  ]);

  // Build lookup sets for O(1) checks
  const registeredByForbisId = new Set(
    registeredRows.map((r) => r.forbisMemberId).filter(Boolean)
  );
  const registeredByName = new Set(
    registeredRows.map((r) => r.name.trim().toLowerCase())
  );

  function isRegistered(member: (typeof members)[number]): boolean {
    if (member.forbisMemberId && registeredByForbisId.has(member.forbisMemberId)) return true;
    return registeredByName.has(member.name.trim().toLowerCase());
  }

  return NextResponse.json(
    {
      members: members.map((member) => ({
        boothName: member.boothName,
        brandName: member.brandName,
        businessCategory: member.businessCategory,
        businessSector: member.businessSector,
        companyAddress: member.companyAddress,
        companyDescription: member.companyDescription,
        companyDistrictCode: member.companyDistrictCode,
        companyDistrictName: member.companyDistrictName,
        companyName: member.companyName,
        companyPhone: member.companyPhone,
        companyProvinceCode: member.companyProvinceCode,
        companyProvinceName: member.companyProvinceName,
        companyRegencyCode: member.companyRegencyCode,
        companyRegencyName: member.companyRegencyName,
        companyVillageCode: member.companyVillageCode,
        companyVillageName: member.companyVillageName,
        companyWhatsapp: member.companyWhatsapp,
        email: member.email,
        forbisMemberId: member.forbisMemberId,
        id: member.id,
        isKmiAlumni: member.isKmiAlumni ?? false,
        kmiYear: member.kmiYear,
        legalEntity: member.legalEntity,
        name: member.name,
        partnershipConcepts: member.partnershipConcepts ?? [],
        phone: member.phone,
        productTags: member.productTags ?? [],
        requestedBoothCategorySlug: member.requestedBoothCategorySlug,
        whatsapp: member.whatsapp,
        isRegistered: isRegistered(member),
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
