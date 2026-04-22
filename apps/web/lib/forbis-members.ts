import type { BusinessFormValues } from "@/lib/validations/tambah_peserta";

export type ForbisMemberOption = {
  boothName: string | null;
  brandName: string | null;
  businessCategory: string | null;
  businessSector: string | null;
  companyAddress: string | null;
  companyDescription: string | null;
  companyDistrictCode: string | null;
  companyDistrictName: string | null;
  companyName: string | null;
  companyPhone: string | null;
  companyProvinceCode: string | null;
  companyProvinceName: string | null;
  companyRegencyCode: string | null;
  companyRegencyName: string | null;
  companyVillageCode: string | null;
  companyVillageName: string | null;
  companyWhatsapp: string | null;
  email: string | null;
  forbisMemberId: string | null;
  id: string;
  isKmiAlumni: boolean;
  kmiYear: string | null;
  legalEntity: string | null;
  name: string;
  partnershipConcepts: string[];
  phone: string | null;
  productTags: string[];
  requestedBoothCategorySlug: string | null;
  whatsapp: string | null;
  isRegistered?: boolean;
};

export function mapForbisMemberToBusinessDefaults(
  member: ForbisMemberOption | null
): Partial<BusinessFormValues> | undefined {
  if (!member) {
    return undefined;
  }

  return {
    boothName: member.boothName || member.companyName || "",
    brandName: member.brandName || "",
    businessCategory: member.businessCategory || "",
    businessSector: member.businessSector || "",
    companyAddress: member.companyAddress || "",
    companyDescription: member.companyDescription || "",
    companyDistrictCode: member.companyDistrictCode || "",
    companyDistrictName: member.companyDistrictName || "",
    companyName: member.companyName || "",
    companyPhone: member.companyPhone || "",
    companyProvinceCode: member.companyProvinceCode || "",
    companyProvinceName: member.companyProvinceName || "",
    companyRegencyCode: member.companyRegencyCode || "",
    companyRegencyName: member.companyRegencyName || "",
    companyVillageCode: member.companyVillageCode || "",
    companyVillageName: member.companyVillageName || "",
    companyWhatsapp: member.companyWhatsapp || "",
    isBoothNameSameAsCompany:
      Boolean(member.companyName) &&
      (member.boothName === member.companyName || !member.boothName),
    legalEntity: member.legalEntity || "",
    partnershipConcepts: member.partnershipConcepts,
    productTags: member.productTags,
    requestedBoothCategorySlug: member.requestedBoothCategorySlug || "",
  };
}
