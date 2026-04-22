import { NextResponse } from "next/server";

import { db } from "@repo/db";

import { dedupeCatalogValues } from "@/lib/registration-catalog";

export async function GET() {
  try {
    const businesses = await db.query.participantBusinesses.findMany({
      columns: {
        brandName: true,
        businessCategory: true,
        businessSector: true,
        legalEntity: true,
        partnershipConcepts: true,
        productTags: true,
      },
    });

    const legalEntities = dedupeCatalogValues(
      businesses.map((business) => business.legalEntity)
    );
    const businessCategories = dedupeCatalogValues(
      businesses.map((business) => business.businessCategory)
    );
    const businessSectors = dedupeCatalogValues(
      businesses.map((business) => business.businessSector)
    );
    const brandNames = dedupeCatalogValues(
      businesses.map((business) => business.brandName)
    );
    const productTags = dedupeCatalogValues(
      businesses.flatMap((business) => business.productTags ?? [])
    );
    const partnershipConcepts = dedupeCatalogValues(
      businesses.flatMap((business) => business.partnershipConcepts ?? [])
    );

    return NextResponse.json(
      {
        legalEntities,
        businessCategories,
        businessSectors,
        brandNames,
        partnershipConcepts,
        productTags,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error loading business catalog:", error);

    return NextResponse.json(
      { error: "Gagal memuat katalog usaha." },
      { status: 500 }
    );
  }
}
