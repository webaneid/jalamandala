import { z } from "zod"

const nonEmptyText = z.string().trim().min(1)

export const businessRegistrationSchema = z.object({
  companyName: z.string().trim().min(2, "Nama Perusahaan/Usaha harus diisi"),
  legalEntity: z.string().trim().min(2, "Badan Hukum Usaha harus diisi"),
  businessCategory: z.string().trim().min(2, "Kategori Usaha harus diisi"),
  businessSector: z.string().trim().min(2, "Bidang Usaha harus diisi"),
  productTags: z.array(nonEmptyText).min(1, "Isi minimal satu produk/jasa"),
  brandName: z.string().trim().min(2, "Merk atau brand harus diisi"),
  partnershipConcepts: z.array(nonEmptyText).min(1, "Pilih minimal satu peluang kemitraan"),
  logoFile: z
    .custom<File | null | undefined>(
      (value) =>
        value == null ||
        (typeof File !== "undefined" && value instanceof File),
      {
        message: "File logo tidak valid",
      }
    )
    .optional()
    .nullable(),
})

export type BusinessRegistrationValues = z.infer<typeof businessRegistrationSchema>
