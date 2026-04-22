"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { createBusiness, updateBusiness } from "@/actions/participants";
import { MediaPicker, type MediaPickerValue } from "@/components/admin/media/MediaPicker";
import { useRouter } from "next/navigation";

import { useSuggestionCatalog } from "@/hooks/use-suggestion-catalog";
import {
  defaultBusinessCategoryOptions,
  defaultBusinessSectorOptions,
  defaultLegalEntityOptions,
  defaultPartnershipOptions,
  dedupeCatalogValues,
} from "@/lib/registration-catalog";
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
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { TagInput } from "@/components/ui/tag-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RegionAutocompleteSelect } from "@/components/forms/RegionAutocompleteSelect";
import { 
  businessSchema,
  type BusinessFormValues
} from "@/lib/validations/tambah_peserta";
import type { BoothCategoryFormOption } from "@/lib/booth-form-options";

interface BusinessFormProps {
  boothCategoryOptions?: BoothCategoryFormOption[];
  onSuccess?: (data: BusinessFormValues) => void;
  businessId?: string;
  existingLogoAssetId?: string | null;
  existingLogoUrl?: string | null;
  participantId: string;
  participantName?: string;
  defaultValues?: Partial<BusinessFormValues>;
}

const EMPTY_ARRAY: string[] = [];

type BusinessCatalogPayload = {
  brandNames?: string[];
  businessCategories?: string[];
  businessSectors?: string[];
  legalEntities?: string[];
  partnershipConcepts?: string[];
  productTags?: string[];
};

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Gagal membaca file logo."));
    };

    reader.onerror = () => {
      reject(new Error("Gagal membaca file logo."));
    };

    reader.readAsDataURL(file);
  });
}

export function BusinessForm({
  boothCategoryOptions = [],
  onSuccess,
  businessId,
  existingLogoAssetId,
  existingLogoUrl,
  participantId,
  participantName,
  defaultValues,
}: BusinessFormProps) {
  const router = useRouter();
  const [catalogFromServer, setCatalogFromServer] =
    React.useState<BusinessCatalogPayload | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      try {
        const response = await fetch("/api/business-catalog", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as BusinessCatalogPayload;

        if (isMounted) {
          setCatalogFromServer(payload);
        }
      } catch {
        // Keep local seeded catalog as fallback when request fails.
      }
    }

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  const legalEntitySeededOptions = React.useMemo(
    () =>
      dedupeCatalogValues([
        ...defaultLegalEntityOptions,
        ...(catalogFromServer?.legalEntities ?? EMPTY_ARRAY),
      ]),
    [catalogFromServer?.legalEntities]
  );
  const businessCategorySeededOptions = React.useMemo(
    () =>
      dedupeCatalogValues([
        ...defaultBusinessCategoryOptions,
        ...(catalogFromServer?.businessCategories ?? EMPTY_ARRAY),
      ]),
    [catalogFromServer?.businessCategories]
  );
  const businessSectorSeededOptions = React.useMemo(
    () =>
      dedupeCatalogValues([
        ...defaultBusinessSectorOptions,
        ...(catalogFromServer?.businessSectors ?? EMPTY_ARRAY),
      ]),
    [catalogFromServer?.businessSectors]
  );
  const brandSeededOptions = React.useMemo(
    () => dedupeCatalogValues(catalogFromServer?.brandNames ?? EMPTY_ARRAY),
    [catalogFromServer?.brandNames]
  );
  const productSeededOptions = React.useMemo(
    () => dedupeCatalogValues(catalogFromServer?.productTags ?? EMPTY_ARRAY),
    [catalogFromServer?.productTags]
  );
  const partnershipSeededOptions = React.useMemo(
    () =>
      dedupeCatalogValues([
        ...defaultPartnershipOptions,
        ...(catalogFromServer?.partnershipConcepts ?? EMPTY_ARRAY),
      ]),
    [catalogFromServer?.partnershipConcepts]
  );

  const legalEntityCatalog = useSuggestionCatalog(
    "legal-entity",
    legalEntitySeededOptions
  );
  const businessCategoryCatalog = useSuggestionCatalog(
    "business-category",
    businessCategorySeededOptions
  );
  const businessSectorCatalog = useSuggestionCatalog(
    "business-sector",
    businessSectorSeededOptions
  );
  const brandCatalog = useSuggestionCatalog("brand-name", brandSeededOptions);
  const productCatalog = useSuggestionCatalog("product-tags", productSeededOptions);
  const partnershipCatalog = useSuggestionCatalog(
    "partnership-concepts",
    partnershipSeededOptions
  );

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema),
    mode: "onChange",
    defaultValues: {
      boothName: "",
      companyName: "",
      companyAddress: "",
      companyDescription: "",
      companyDistrictCode: "",
      companyDistrictName: "",
      companyPhone: "",
      companyProvinceCode: "",
      companyProvinceName: "",
      companyRegencyCode: "",
      companyRegencyName: "",
      companyVillageCode: "",
      companyVillageName: "",
      companyWhatsapp: "",
      isBoothNameSameAsCompany: true,
      legalEntity: "",
      businessCategory: "",
      businessSector: "",
      brandName: "",
      productTags: [],
      partnershipConcepts: [],
      logoFile: null,
      requestedBoothCategorySlug: "",
      ...defaultValues,
    },
  });

  const [isPending, setIsPending] = React.useState(false);
  const [logoAsset, setLogoAsset] = React.useState<MediaPickerValue>(
    existingLogoAssetId
      ? { id: existingLogoAssetId, url: `/api/media/${existingLogoAssetId}`, objectKey: "", fileName: "logo", mimeType: "image/*" }
      : null
  );
  const watchCompanyName = form.watch("companyName");
  const watchCompanyProvinceCode = form.watch("companyProvinceCode");
  const watchCompanyRegencyCode = form.watch("companyRegencyCode");
  const watchCompanyDistrictCode = form.watch("companyDistrictCode");
  const watchLogoFile = form.watch("logoFile");
  const watchSameBoothName = form.watch("isBoothNameSameAsCompany");
  const watchPartnershipConcepts = form.watch("partnershipConcepts");
  const productTypeOptions = React.useMemo(
    () =>
      [
        { label: "Makanan siap saji", slug: "fnb_dry_food" },
        { label: "Makanan dimasak di tempat", slug: "fnb_kitchen" },
        { label: "Non Makanan", slug: "non_fnb" },
      ].filter((option) =>
        boothCategoryOptions.some((category) => category.slug === option.slug)
      ),
    [boothCategoryOptions]
  );
  const customPartnershipConcepts = React.useMemo(
    () =>
      watchPartnershipConcepts.filter(
        (value) =>
          !defaultPartnershipOptions.includes(
            value as (typeof defaultPartnershipOptions)[number]
          )
      ),
    [watchPartnershipConcepts]
  );

  React.useEffect(() => {
    if (watchSameBoothName) {
      form.setValue("boothName", watchCompanyName, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [form, watchCompanyName, watchSameBoothName]);

  function setRegion(
    codeField:
      | "companyProvinceCode"
      | "companyRegencyCode"
      | "companyDistrictCode"
      | "companyVillageCode",
    nameField:
      | "companyProvinceName"
      | "companyRegencyName"
      | "companyDistrictName"
      | "companyVillageName",
    region: { code: string; name: string } | null
  ) {
    form.setValue(codeField, region?.code ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue(nameField, region?.name ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function clearRegency() {
    setRegion("companyRegencyCode", "companyRegencyName", null);
    clearDistrict();
  }

  function clearDistrict() {
    setRegion("companyDistrictCode", "companyDistrictName", null);
    clearVillage();
  }

  function clearVillage() {
    setRegion("companyVillageCode", "companyVillageName", null);
  }

  const onSubmit = async (values: BusinessFormValues) => {
    setIsPending(true);
    try {
      legalEntityCatalog.registerOption(values.legalEntity);
      businessCategoryCatalog.registerOption(values.businessCategory);
      businessSectorCatalog.registerOption(values.businessSector);
      brandCatalog.registerOption(values.brandName);
      productCatalog.registerOptions(values.productTags);
      partnershipCatalog.registerOptions(values.partnershipConcepts);

      const payload = {
        ...values,
        logoUpload: null,
        logoAssetId: logoAsset?.id || null,
      };

      const res = businessId
        ? await updateBusiness(businessId, payload)
        : await createBusiness(participantId, payload);

      if (res.success && res.data) {
        form.reset();
        onSuccess?.(res.data as any);
        if (businessId) {
          router.push(`/admin/peserta/${participantId}`);
        }
      } else {
        alert(res.error || "Gagal menyimpan data usaha.");
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-[32px] border-none shadow-none bg-white/72 p-1 sm:p-2">
      <CardContent className="p-5 sm:p-6 md:p-8">
        {participantName && (
          <div className="mb-6 p-4 rounded-2xl bg-primary-50 text-primary-900 ring-1 ring-primary-100">
            {businessId ? "Mengubah usaha untuk" : "Menambahkan usaha untuk"}:{" "}
            <span className="font-bold">{participantName}</span>
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormItem>
              <FormLabel>Logo Usaha</FormLabel>
              <FormControl>
                <MediaPicker
                  value={logoAsset}
                  onChange={setLogoAsset}
                  accept="image"
                  folder="private/participant-logos"
                  visibility="private"
                  placeholder="Pilih atau upload logo usaha..."
                />
              </FormControl>
            </FormItem>

            <FormField control={form.control} name="companyName" render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Perusahaan / Usaha *</FormLabel>
                <FormControl><Input placeholder="Contoh: PT Maju Bersama" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <FormField control={form.control} name="boothName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Booth *</FormLabel>
                    <FormControl>
                      <Input
                        disabled={watchSameBoothName}
                        placeholder="Nama yang tampil di booth"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isBoothNameSameAsCompany" render={({ field }) => (
                  <FormItem className="flex items-start space-x-2 space-y-0 px-1">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="cursor-pointer text-xs font-normal text-muted-foreground">
                      Sama dengan nama usaha
                    </FormLabel>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="requestedBoothCategorySlug" render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis Produk untuk Expo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 w-full rounded-2xl">
                        <SelectValue placeholder="Pilih jenis produk" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {productTypeOptions.map((option) => (
                        <SelectItem key={option.slug} value={option.slug}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Disimpan mengikuti booth category agar nanti cocok dengan booking tenant.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="companyDescription" render={({ field }) => (
              <FormItem>
                <FormLabel>Tentang perusahaan *</FormLabel>
                <FormDescription>
                  Jelaskan tentang perusahaan Anda dalam 150 kata saja.
                </FormDescription>
                <FormControl>
                  <textarea
                    className="min-h-32 w-full rounded-2xl border border-input bg-background px-3 py-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Ceritakan profil singkat, produk utama, pasar, dan keunggulan perusahaan."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField control={form.control} name="companyPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor kontak perusahaan</FormLabel>
                  <FormControl>
                    <Input placeholder="021xxxx / 08xxxx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="companyWhatsapp" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor WhatsApp perusahaan</FormLabel>
                  <FormControl>
                    <Input placeholder="08xxxx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="companyAddress" render={({ field }) => (
              <FormItem>
                <FormLabel>Alamat perusahaan *</FormLabel>
                <FormControl>
                  <textarea
                    className="min-h-24 w-full rounded-2xl border border-input bg-background px-3 py-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Nama jalan, nomor, gedung, atau patokan alamat"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField control={form.control} name="companyProvinceCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Provinsi *</FormLabel>
                  <FormControl>
                    <RegionAutocompleteSelect
                      level="province"
                      onBlur={field.onBlur}
                      onSelect={(region) => {
                        setRegion("companyProvinceCode", "companyProvinceName", region);
                        clearRegency();
                      }}
                      placeholder="Pilih provinsi"
                      valueCode={field.value}
                      valueName={form.watch("companyProvinceName")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="companyRegencyCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kabupaten/Kota *</FormLabel>
                  <FormControl>
                    <RegionAutocompleteSelect
                      disabled={!watchCompanyProvinceCode}
                      level="regency"
                      onBlur={field.onBlur}
                      onSelect={(region) => {
                        setRegion("companyRegencyCode", "companyRegencyName", region);
                        clearDistrict();
                      }}
                      parentCode={watchCompanyProvinceCode}
                      placeholder="Pilih kabupaten/kota"
                      valueCode={field.value}
                      valueName={form.watch("companyRegencyName")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="companyDistrictCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kecamatan *</FormLabel>
                  <FormControl>
                    <RegionAutocompleteSelect
                      disabled={!watchCompanyRegencyCode}
                      level="district"
                      onBlur={field.onBlur}
                      onSelect={(region) => {
                        setRegion("companyDistrictCode", "companyDistrictName", region);
                        clearVillage();
                      }}
                      parentCode={watchCompanyRegencyCode}
                      placeholder="Pilih kecamatan"
                      valueCode={field.value}
                      valueName={form.watch("companyDistrictName")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="companyVillageCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Desa/Kelurahan *</FormLabel>
                  <FormControl>
                    <RegionAutocompleteSelect
                      disabled={!watchCompanyDistrictCode}
                      level="village"
                      onBlur={field.onBlur}
                      onSelect={(region) =>
                        setRegion("companyVillageCode", "companyVillageName", region)
                      }
                      parentCode={watchCompanyDistrictCode}
                      placeholder="Pilih desa/kelurahan"
                      valueCode={field.value}
                      valueName={form.watch("companyVillageName")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField control={form.control} name="legalEntity" render={({ field }) => (
              <FormItem>
                <FormLabel>Badan Hukum Usaha *</FormLabel>
                <FormControl>
                    <AutocompleteInput
                      placeholder="Pilih atau ketik badan hukum"
                      value={field.value}
                      options={legalEntityCatalog.options}
                      onBlur={field.onBlur}
                      onCommitOption={legalEntityCatalog.registerOption}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="businessCategory" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori Usaha *</FormLabel>
                  <FormControl>
                    <AutocompleteInput
                      placeholder="Pilih atau ketik kategori usaha"
                      value={field.value}
                      options={businessCategoryCatalog.options}
                      onBlur={field.onBlur}
                      onCommitOption={businessCategoryCatalog.registerOption}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="businessSector" render={({ field }) => (
              <FormItem>
                <FormLabel>Bidang Usaha *</FormLabel>
                <FormControl>
                  <AutocompleteInput
                    placeholder="Pilih atau ketik bidang usaha"
                    value={field.value}
                    options={businessSectorCatalog.options}
                    onBlur={field.onBlur}
                    onCommitOption={businessSectorCatalog.registerOption}
                    onValueChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="productTags" render={({ field }) => (
              <FormItem>
                <FormLabel>Produk/jasa yang akan dibawa *</FormLabel>
                <FormControl>
                  <TagInput
                    placeholder="Ketik produk, tekan Enter"
                    values={field.value}
                    suggestions={productCatalog.options}
                    onCommitOption={productCatalog.registerOption}
                    onValuesChange={(nextValues) => {
                      field.onChange(nextValues);
                      productCatalog.registerOptions(nextValues);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="brandName" render={({ field }) => (
              <FormItem>
                <FormLabel>Merk atau brand produk *</FormLabel>
                <FormControl>
                  <AutocompleteInput
                    placeholder="Pilih atau ketik merk/brand"
                    value={field.value}
                    options={brandCatalog.options}
                    onBlur={field.onBlur}
                    onCommitOption={brandCatalog.registerOption}
                    onValueChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="partnershipConcepts" render={({ field }) => (
              <FormItem className="space-y-4">
                <div className="space-y-2">
                  <FormLabel>Konsep & Peluang kemitraan yang akan ditawarkan *</FormLabel>
                  <FormDescription>
                    Pilih satu atau lebih, lalu tambahkan opsi lain bila dibutuhkan.
                  </FormDescription>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {defaultPartnershipOptions.map((option) => {
                    const checked = field.value.includes(option);

                    return (
                      <label
                        key={option}
                        className="flex items-center gap-3 rounded-2xl border border-border/80 bg-muted/20 px-4 py-3"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) => {
                            if (nextChecked) {
                              const nextValues = dedupeCatalogValues([
                                ...field.value,
                                option,
                              ]);
                              field.onChange(nextValues);
                              partnershipCatalog.registerOption(option);
                              return;
                            }

                            field.onChange(
                              field.value.filter((value) => value !== option)
                            );
                          }}
                        />
                        <span className="text-sm text-foreground">{option}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Lainnya</p>
                  <TagInput
                    placeholder="Tambah peluang kemitraan lain"
                    suggestions={partnershipCatalog.options.filter(
                      (option) =>
                        !defaultPartnershipOptions.includes(
                          option as (typeof defaultPartnershipOptions)[number]
                        )
                    )}
                    values={customPartnershipConcepts}
                    onCommitOption={partnershipCatalog.registerOption}
                    onValuesChange={(customValues) => {
                      const defaultValues = field.value.filter((value) =>
                        defaultPartnershipOptions.includes(
                          value as (typeof defaultPartnershipOptions)[number]
                        )
                      );
                      const nextValues = dedupeCatalogValues([
                        ...defaultValues,
                        ...customValues,
                      ]);

                      field.onChange(nextValues);
                      partnershipCatalog.registerOptions(customValues);
                    }}
                  />
                </div>

                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end pt-6 border-t border-border/60">
              <Button type="submit" disabled={isPending} className="bg-primary-600 hover:bg-primary-700 h-11 px-8 rounded-2xl">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {businessId ? "Perbarui Data Usaha" : "Simpan Data Usaha"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
