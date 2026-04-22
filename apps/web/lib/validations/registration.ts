import { z } from "zod";
import { businessRegistrationSchema } from "./registration-shared";

export const tenantRegistrationSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap harus diisi"),
  whatsapp: z.string().min(9, "Nomor WhatsApp tidak valid"),
  
  isKmiAlumni: z.enum(["ya", "tidak"]),
  kmiYear: z.string().optional(),
  
  website: z.string().url("URL tidak valid").optional().or(z.literal("")),
  facebook: z.string().url("URL tidak valid").optional().or(z.literal("")),
  instagram: z.string().url("URL tidak valid").optional().or(z.literal("")),
  tiktok: z.string().url("URL tidak valid").optional().or(z.literal("")),
  
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Anda harus menyetujui syarat & ketentuan",
  }),
}).merge(businessRegistrationSchema).refine((data) => {
  if (data.isKmiAlumni === "ya" && !data.kmiYear) return false;
  return true;
}, {
  message: "Tahun lulus wajib diisi jika Anda alumni",
  path: ["kmiYear"],
});

export type TenantRegistrationFormValues = z.infer<typeof tenantRegistrationSchema>;
