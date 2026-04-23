import { db } from "@repo/db";
import { participantBusinesses } from "@repo/db/schema/public";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BusinessForm } from "@/components/forms/BusinessForm";
import { getBoothFormOptions } from "@/lib/booth-form-options";


export const metadata = {
  title: "Edit Usaha Peserta",
};

export default async function ParticipantBusinessEditPage({
  params,
}: {
  params: { id: string; businessId: string };
}) {
  const { id, businessId } = await params;

  const business = await db.query.participantBusinesses.findFirst({
    where: eq(participantBusinesses.id, businessId),
    with: {
      participant: true,
    },
  });

  if (!business || business.participantId !== id) {
    notFound();
  }

  const { boothCategories } = await getBoothFormOptions();
  const boothName = business.boothName || business.companyName;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-20">
      <AdminPageHeader
        align="centered"
        eyebrow="Edit Business"
        title="Perbarui data usaha peserta"
        description={`Mengubah data usaha ${business.companyName}`}
      />

      <BusinessForm
        boothCategoryOptions={boothCategories}
        businessId={business.id}
        existingLogoAssetId={business.logoAssetId}
        participantId={business.participantId}
        participantName={business.participant?.name}
        defaultValues={{
          brandName: business.brandName,
          boothName,
          businessCategory: business.businessCategory,
          businessSector: business.businessSector,
          companyAddress: business.companyAddress ?? "",
          companyDescription: business.companyDescription ?? "",
          companyDistrictCode: business.companyDistrictCode ?? "",
          companyDistrictName: business.companyDistrictName ?? "",
          companyPhone: business.companyPhone ?? "",
          companyProvinceCode: business.companyProvinceCode ?? "",
          companyProvinceName: business.companyProvinceName ?? "",
          companyRegencyCode: business.companyRegencyCode ?? "",
          companyRegencyName: business.companyRegencyName ?? "",
          companyVillageCode: business.companyVillageCode ?? "",
          companyVillageName: business.companyVillageName ?? "",
          companyWhatsapp: business.companyWhatsapp ?? "",
          companyName: business.companyName,
          isBoothNameSameAsCompany: boothName === business.companyName,
          legalEntity: business.legalEntity,
          partnershipConcepts: business.partnershipConcepts ?? [],
          productTags: business.productTags ?? [],
          requestedBoothCategorySlug: business.requestedBoothCategorySlug ?? "",
        }}
      />
    </div>
  );
}
