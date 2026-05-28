import { db } from "@repo/db";
import { mediaAssets, participantBusinesses } from "@repo/db/schema/public";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { generatePresignedGetUrl } from "@/lib/minio-storage";

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
    with: { participant: true },
  });

  if (!business || business.participantId !== id) {
    notFound();
  }

  const { boothCategories } = await getBoothFormOptions();
  const boothName = business.boothName || business.companyName;

  let existingLogoUrl: string | null = null;
  if (business.logoAssetId) {
    const asset = await db.query.mediaAssets.findFirst({
      where: eq(mediaAssets.id, business.logoAssetId),
      columns: { publicUrl: true, objectKey: true },
    });
    existingLogoUrl = asset?.publicUrl ?? (asset?.objectKey ? generatePresignedGetUrl(asset.objectKey, 3600 * 6) : null);
  }

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
        existingLogoUrl={existingLogoUrl}
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
          teamMaleCount: business.teamMaleCount ?? null,
          teamFemaleCount: business.teamFemaleCount ?? null,
        }}
      />
    </div>
  );
}
