import { z } from "zod";

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

// Schema untuk Data Pribadi (Participant)
export const participantSchema = z.object({
  forbisMemberId: z.string().optional(),
  organizationGroupId: z.string().min(1, "Pilih organisasi terlebih dahulu"),
  fullName: z.string().min(2, "Nama lengkap harus diisi"),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  phone: z.string().min(9, "Nomor Telepon tidak valid"),
  isSameAsPhone: z.boolean(),
  whatsapp: z.string().min(9, "Nomor WhatsApp tidak valid"),
  isKmiAlumni: z.string().min(1, "Pilih status alumni"),
  kmiYear: z.string().optional(),
}).refine((data) => {
  if (data.isKmiAlumni === "Ya" && (!data.kmiYear || !/^\d{4}$/.test(data.kmiYear))) {
    return false;
  }
  return true;
}, {
  message: "Tahun lulus harus berupa 4 angka (misal: 2010)",
  path: ["kmiYear"],
});

// Schema untuk Data Usaha (Business)
export const businessSchema = z.object({
  companyName: z.string().min(2, "Nama perusahaan harus diisi"),
  boothName: z.string().min(2, "Nama booth harus diisi"),
  isBoothNameSameAsCompany: z.boolean(),
  requestedBoothCategorySlug: z.string().min(1, "Pilih jenis produk pameran"),
  companyDescription: z
    .string()
    .min(10, "Tentang perusahaan harus diisi")
    .refine((value) => countWords(value) <= 150, {
      message: "Tentang perusahaan maksimal 150 kata",
    }),
  companyPhone: z.string().optional(),
  companyWhatsapp: z.string().optional(),
  companyAddress: z.string().min(5, "Alamat perusahaan harus diisi"),
  companyProvinceCode: z.string().min(1, "Pilih provinsi"),
  companyProvinceName: z.string().min(1, "Pilih provinsi"),
  companyRegencyCode: z.string().min(1, "Pilih kabupaten/kota"),
  companyRegencyName: z.string().min(1, "Pilih kabupaten/kota"),
  companyDistrictCode: z.string().min(1, "Pilih kecamatan"),
  companyDistrictName: z.string().min(1, "Pilih kecamatan"),
  companyVillageCode: z.string().min(1, "Pilih desa/kelurahan"),
  companyVillageName: z.string().min(1, "Pilih desa/kelurahan"),
  legalEntity: z.string().min(1, "Pilih badan hukum"),
  businessCategory: z.string().min(1, "Pilih kategori usaha"),
  businessSector: z.string().min(1, "Pilih bidang usaha"),
  brandName: z.string().min(2, "Nama brand harus diisi"),
  productTags: z.array(z.string()).min(1, "Minimal satu produk harus dicantumkan"),
  partnershipConcepts: z.array(z.string()).min(1, "Pilih minimal satu konsep kemitraan"),
  logoFile: z.any().optional(), // File upload handled in component
});

// Full type for the multi-step form state (if still needed as a combined type)
export type ParticipantFormValues = z.infer<typeof participantSchema>;
export type BusinessFormValues = z.infer<typeof businessSchema>;

// Combined type for legacy support or full confirmation
export type TambahPesertaFormValues = ParticipantFormValues & {
  businesses: BusinessFormValues[];
};
