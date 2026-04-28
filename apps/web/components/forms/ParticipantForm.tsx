"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, AlertTriangle } from "lucide-react";
import { createParticipant, updateParticipant } from "@/actions/participants";
import { useParticipantDuplicateCheck } from "@/hooks/use-participant-duplicate-check";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ForbisMemberSearch } from "@/components/forms/ForbisMemberSearch";
import { OptionAutocompleteSelect } from "@/components/forms/OptionAutocompleteSelect";
import { 
  participantSchema,
  type ParticipantFormValues 
} from "@/lib/validations/tambah_peserta";
import type { BoothGroupFormOption } from "@/lib/booth-form-options";
import type { ForbisMemberOption } from "@/lib/forbis-members";

interface ParticipantFormProps {
  boothGroupOptions?: BoothGroupFormOption[];
  onForbisMemberSelect?: (member: ForbisMemberOption | null) => void;
  onSuccess?: (data: ParticipantFormValues) => void;
  participantId?: string;
  defaultValues?: Partial<ParticipantFormValues>;
}


function DuplicateWarning({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-amber-700 mt-1">
      <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
      <span>{message} Hubungi admin atau gunakan <strong>Lupa Password</strong> untuk mengakses akun yang ada.</span>
    </p>
  );
}

export function ParticipantForm({
  boothGroupOptions = [],
  onForbisMemberSelect,
  onSuccess,
  participantId,
  defaultValues,
}: ParticipantFormProps) {
  const router = useRouter();
  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantSchema),
    mode: "onChange",
    defaultValues: {
      organizationGroupId: "",
      fullName: "",
      email: "",
      phone: "",
      whatsapp: "",
      isSameAsPhone: false,
      isKmiAlumni: "",
      kmiYear: "",
      forbisMemberId: "",
      ...defaultValues,
    },
  });

  const watchOrganizationGroupId = form.watch("organizationGroupId");
  const watchIsSameAsPhone = form.watch("isSameAsPhone");
  const watchPhone = form.watch("phone");
  const watchIsKmiAlumni = form.watch("isKmiAlumni");
  const selectedOrganization = boothGroupOptions.find(
    (group) => group.id === watchOrganizationGroupId
  );
  const isForbisOrganization = selectedOrganization?.slug === "forbis";
  const isIdentityLocked = !watchOrganizationGroupId;

  const [isPending, setIsPending] = React.useState(false);

  const watchEmail = form.watch("email");
  const watchWhatsapp = form.watch("whatsapp");
  const duplicates = useParticipantDuplicateCheck(
    { email: watchEmail ?? "", phone: watchPhone, whatsapp: watchIsSameAsPhone ? watchPhone : watchWhatsapp },
    participantId
  );
  const hasDuplicate = !!(duplicates.email || duplicates.phone || duplicates.whatsapp);

  // Logic Checkbox WhatsApp
  React.useEffect(() => {
    if (watchIsSameAsPhone) {
      form.setValue("whatsapp", watchPhone, { shouldValidate: true });
    }
  }, [watchIsSameAsPhone, watchPhone, form]);

  React.useEffect(() => {
    if (!isForbisOrganization) {
      form.setValue("forbisMemberId", "", { shouldValidate: true });
      onForbisMemberSelect?.(null);
    }
  }, [form, isForbisOrganization]);

  function applyForbisMember(member: ForbisMemberOption) {
    onForbisMemberSelect?.(member);
    form.setValue("forbisMemberId", member.forbisMemberId || "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("fullName", member.name, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("phone", member.phone || "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("whatsapp", member.whatsapp || member.phone || "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("isSameAsPhone", Boolean(member.phone && member.phone === member.whatsapp), {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("isKmiAlumni", member.isKmiAlumni ? "Ya" : "Bukan", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("kmiYear", member.kmiYear || "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("email", member.email || "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  const onSubmit = async (values: ParticipantFormValues) => {
    setIsPending(true);
    try {
      const res = participantId 
        ? await updateParticipant(participantId, values)
        : await createParticipant(values);
        
      if (res.success && res.data) {
        onSuccess?.(res.data as any);
        if (participantId) {
          router.push(`/admin/peserta/${participantId}`);
        }
      } else {
        alert(res.error || "Gagal menyimpan data.");
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-[32px] border-none shadow-none bg-white/72 p-1 sm:p-2">
      <CardContent className="p-5 sm:p-6 md:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="organizationGroupId" render={({ field }) => (
              <FormItem>
                <FormLabel>Pilih Organisasi *</FormLabel>
                <FormControl>
                  <OptionAutocompleteSelect
                    onBlur={field.onBlur}
                    onValueChange={field.onChange}
                    options={boothGroupOptions.map((group) => ({
                      id: group.id,
                      label: group.name,
                      slug: group.slug,
                    }))}
                    placeholder="Cari atau pilih organisasi peserta"
                    value={field.value}
                  />
                </FormControl>
                <FormDescription>
                  Data identitas dibuka setelah organisasi dipilih.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="fullName" render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Lengkap *</FormLabel>
                <FormControl>
                  {isForbisOrganization ? (
                    <ForbisMemberSearch
                      disabled={isIdentityLocked}
                      onChange={field.onChange}
                      onSelect={applyForbisMember}
                      value={field.value}
                      variant="light"
                    />
                  ) : (
                    <Input disabled={isIdentityLocked} placeholder="Masukkan nama lengkap sesuai identitas" {...field} />
                  )}
                </FormControl>
                {isForbisOrganization && (
                  <FormDescription>Ketik nama untuk cari anggota FORBIS dan isi otomatis — data bisa diubah.</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input disabled={isIdentityLocked} type="email" placeholder="contoh@email.com" {...field} /></FormControl>
                {duplicates.email ? (
                  <DuplicateWarning message={`Email sudah terdaftar atas nama ${duplicates.email}.`} />
                ) : (
                  <FormDescription>Opsional. Digunakan untuk pengiriman invoice dan notifikasi.</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )} />

            {isForbisOrganization && (
              <FormField control={form.control} name="forbisMemberId" render={({ field }) => (
                <FormItem className="max-w-xs animate-in slide-in-from-top-2">
                  <FormLabel>Nomor ID FORBIS</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isIdentityLocked}
                      placeholder="Opsional, contoh: 2016*****"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Opsional. Boleh diubah jika data master belum akurat.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor Telepon *</FormLabel>
                  <FormControl><Input disabled={isIdentityLocked} placeholder="081234567890" {...field} /></FormControl>
                  {duplicates.phone && <DuplicateWarning message={`Nomor telepon sudah terdaftar atas nama ${duplicates.phone}.`} />}
                  <FormMessage />
                </FormItem>
              )} />

              <div className="space-y-3">
                <FormField control={form.control} name="whatsapp" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor WhatsApp *</FormLabel>
                    <FormControl><Input placeholder="081234567890" {...field} disabled={isIdentityLocked || watchIsSameAsPhone} /></FormControl>
                    {duplicates.whatsapp && !duplicates.phone && <DuplicateWarning message={`Nomor WhatsApp sudah terdaftar atas nama ${duplicates.whatsapp}.`} />}
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isSameAsPhone" render={({ field }) => (
                  <FormItem className="flex items-start space-x-2 space-y-0 px-1">
                    <FormControl><Checkbox checked={field.value} disabled={isIdentityLocked} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="text-xs text-muted-foreground font-normal cursor-pointer">Sama dengan nomor telepon</FormLabel>
                  </FormItem>
                )} />
              </div>
            </div>

            <FormField control={form.control} name="isKmiAlumni" render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>Alumni Pondok Modern Gontor? *</FormLabel>
                <Select disabled={isIdentityLocked} onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Ya">Ya</SelectItem>
                    <SelectItem value="Bukan">Bukan</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {watchIsKmiAlumni === "Ya" && (
              <FormField control={form.control} name="kmiYear" render={({ field }) => (
                  <FormItem className="max-w-xs animate-in slide-in-from-top-2">
                    <FormLabel>Tahun Lulus KMI? *</FormLabel>
                  <FormControl><Input disabled={isIdentityLocked} type="number" placeholder="2010" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
            )}

            <div className="flex justify-end pt-6 border-t border-border/60">
              <Button type="submit" disabled={isPending || isIdentityLocked || hasDuplicate} className="bg-primary-600 hover:bg-primary-700 h-11 px-8 rounded-2xl">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {participantId ? "Perbarui Identitas" : "Simpan Identitas Peserta"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
