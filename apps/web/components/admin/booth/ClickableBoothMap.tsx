"use client";

import * as React from "react";
import { Loader2, MapPin, MoveRight, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  updateBoothConfiguration,
  updateZoneFacilities,
  updateZoneImage,
  updateZoneLocation,
  updateZonePrices,
} from "@/actions/booths";
import { MediaPicker, type MediaPickerValue } from "@/components/admin/media/MediaPicker";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type BoothMapZone = {
  booths: BoothMapBooth[];
  colorCode: string | null;
  description: string | null;
  id: string;
  imageAssetId: string | null;
  location: string | null;
  name: string;
  priceRules: ZonePriceRule[];
  slug: string;
};

export type BoothMapBooth = {
  boothCategory: {
    id: string;
    name: string;
    slug: string;
  };
  boothGroup: {
    defaultPriceGroup: string | null;
    id: string;
    name: string;
    slug: string;
  };
  booking: {
    businessId: string;
    id: string;
  } | null;
  code: string;
  facilities: string[];
  height: number | null;
  id: string;
  name: string;
  notes: string | null;
  status: string;
  width: number | null;
  x: number | null;
  y: number | null;
};

export type ZonePriceRule = {
  currency: string;
  id: string;
  isActive: boolean;
  price: number;
  priceGroup: string;
  pricePhase: string;
};

export type CompanyOption = {
  brandName: string;
  companyName: string;
  id: string;
  participantName: string;
  productTags: string[];
  requestedBoothCategoryName: string | null;
};

type BoothOption = {
  defaultPriceGroup?: string | null;
  id: string;
  name: string;
  slug: string;
};

type SelectedBooth = {
  booth: BoothMapBooth;
  zone: BoothMapZone;
};

type BoothEditorState = {
  booth: BoothMapBooth;
  businessLabel: string;
  boothCategoryId: string;
  boothGroupId: string;
  status: string;
  zone: BoothMapZone;
};

type ZoneEditorState =
  | {
      facilitiesText: string;
      mode: "facilities";
      zone: BoothMapZone;
    }
  | {
      mode: "prices";
      priceRows: Array<{
        price: string;
        priceGroup: string;
        pricePhase: string;
      }>;
      zone: BoothMapZone;
    }
  | {
      image: MediaPickerValue;
      mode: "image";
      zone: BoothMapZone;
    }
  | {
      location: string;
      mode: "location";
      zone: BoothMapZone;
    }
  | null;

export function ClickableBoothMap({
  boothCategories,
  boothGroups,
  companies,
  zones,
}: {
  boothCategories: BoothOption[];
  boothGroups: BoothOption[];
  companies: CompanyOption[];
  zones: BoothMapZone[];
}) {
  const router = useRouter();
  const [isSaving, startSaving] = React.useTransition();
  const [boothEditor, setBoothEditor] = React.useState<BoothEditorState | null>(null);
  const [boothEditorError, setBoothEditorError] = React.useState("");
  const [zoneEditor, setZoneEditor] = React.useState<ZoneEditorState>(null);
  const [editorError, setEditorError] = React.useState("");

  const companyOptions = React.useMemo(
    () =>
      companies.map((company) => ({
        id: company.id,
        label: `${company.companyName} · ${company.brandName} · ${company.participantName}`,
      })),
    [companies]
  );
  const companyLabelToId = React.useMemo(
    () => new Map(companyOptions.map((company) => [company.label, company.id])),
    [companyOptions]
  );

  function openBooth(zone: BoothMapZone, booth: BoothMapBooth) {
    const currentCompanyLabel =
      companyOptions.find((company) => company.id === booth.booking?.businessId)?.label ?? "";

    setBoothEditorError("");
    setBoothEditor({
      booth,
      boothCategoryId: booth.boothCategory.id,
      boothGroupId: booth.boothGroup.id,
      businessLabel: currentCompanyLabel,
      status: booth.status,
      zone,
    });
  }

  function openFacilitiesEditor(zone: BoothMapZone) {
    setEditorError("");
    setZoneEditor({
      facilitiesText: resolveZoneFacilities(zone).join("\n"),
      mode: "facilities",
      zone,
    });
  }

  function openPricesEditor(zone: BoothMapZone) {
    setEditorError("");
    setZoneEditor({
      mode: "prices",
      priceRows: buildEditablePriceRows(zone),
      zone,
    });
  }

  function openLocationEditor(zone: BoothMapZone) {
    setEditorError("");
    setZoneEditor({ mode: "location", location: zone.location ?? "", zone });
  }

  function openImageEditor(zone: BoothMapZone) {
    setEditorError("");
    setZoneEditor({
      image: zone.imageAssetId
        ? {
            id: zone.imageAssetId,
            url: `/api/media/${zone.imageAssetId}`,
            objectKey: "",
            fileName: `${zone.name} image`,
            mimeType: "image/*",
          }
        : null,
      mode: "image",
      zone,
    });
  }

  function saveZoneEditor() {
    if (!zoneEditor) {
      return;
    }

    setEditorError("");
    startSaving(async () => {
      const result =
        zoneEditor.mode === "facilities"
          ? await updateZoneFacilities(
              zoneEditor.zone.id,
              zoneEditor.facilitiesText
                .split(/\n|,/)
                .map((item) => item.trim())
                .filter(Boolean)
            )
          : zoneEditor.mode === "prices"
            ? await updateZonePrices(
              zoneEditor.zone.id,
              zoneEditor.priceRows.map((row) => ({
                price: Number(row.price),
                priceGroup: row.priceGroup,
                pricePhase: row.pricePhase,
              }))
            )
            : zoneEditor.mode === "location"
              ? await updateZoneLocation(zoneEditor.zone.id, zoneEditor.location.trim() || null)
              : await updateZoneImage(zoneEditor.zone.id, zoneEditor.image?.id ?? null);

      if (!result.success) {
        setEditorError(result.error ?? "Gagal menyimpan perubahan.");
        return;
      }

      setZoneEditor(null);
      router.refresh();
    });
  }

  function saveBoothEditor() {
    if (!boothEditor) {
      return;
    }

    setBoothEditorError("");
    startSaving(async () => {
      const businessId =
        boothEditor.status === "booked"
          ? companyLabelToId.get(boothEditor.businessLabel.trim()) ?? null
          : null;

      const result = await updateBoothConfiguration({
        boothCategoryId: boothEditor.boothCategoryId,
        boothGroupId: boothEditor.boothGroupId,
        boothId: boothEditor.booth.id,
        businessId,
        status: boothEditor.status,
      });

      if (!result.success) {
        setBoothEditorError(result.error ?? "Gagal memperbarui booth.");
        return;
      }

      setBoothEditor(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-4">
        {zones.map((zone) => {
          const viewport = resolveViewport(zone);
          const booked = zone.booths.filter((booth) => booth.status === "booked").length;
          const open = zone.booths.filter((booth) => booth.status === "open").length;
          const facilities = resolveZoneFacilities(zone);
          const priceGroups = resolveZonePriceGroups(zone);

          return (
            <Card key={zone.id} className="border-white/80 bg-white/90">
              <CardHeader className="border-b border-border/60">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span
                        className="size-3 rounded-full ring-2 ring-white"
                        style={{ backgroundColor: zone.colorCode ?? "#134397" }}
                      />
                      <CardTitle>{zone.name}</CardTitle>
                      <Badge className="bg-white text-primary-700 ring-1 ring-primary-100">
                        {zone.booths.length} booth
                      </Badge>
                    </div>
                    {zone.description ? (
                      <CardDescription>{zone.description}</CardDescription>
                    ) : null}
                    <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                      <MapPin className="size-4 text-primary-700" />
                      {zone.location ? (
                        <span>{zone.location}</span>
                      ) : (
                        <span className="italic text-muted-foreground/50">Lokasi belum diisi</span>
                      )}
                      <button
                        className="inline-flex size-6 items-center justify-center rounded-lg border border-border/70 bg-white text-muted-foreground transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                        onClick={() => openLocationEditor(zone)}
                        type="button"
                      >
                        <Pencil className="size-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>Open {open}</span>
                    <MoveRight className="size-4" />
                    <span>Terisi {booked}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="mb-5 grid gap-3 lg:grid-cols-[0.8fr_1fr_1.1fr]">
                  <div className="rounded-2xl border border-border/70 bg-white/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Feature Image
                      </p>
                      <button
                        className="inline-flex size-8 items-center justify-center rounded-xl border border-border/70 bg-white text-muted-foreground transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                        onClick={() => openImageEditor(zone)}
                        type="button"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                      {zone.imageAssetId ? (
                        <img
                          src={`/api/media/${zone.imageAssetId}`}
                          alt={zone.name}
                          className="aspect-video w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-video items-center justify-center text-xs text-muted-foreground">
                          Belum ada gambar
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-white/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Fasilitas
                      </p>
                      <button
                        className="inline-flex size-8 items-center justify-center rounded-xl border border-border/70 bg-white text-muted-foreground transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                        onClick={() => openFacilitiesEditor(zone)}
                        type="button"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {facilities.map((facility) => (
                        <Badge
                          key={facility}
                          className="bg-primary-50 text-primary-700 ring-1 ring-primary-100"
                        >
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-white/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Harga
                      </p>
                      <button
                        className="inline-flex size-8 items-center justify-center rounded-xl border border-border/70 bg-white text-muted-foreground transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                        onClick={() => openPricesEditor(zone)}
                        type="button"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 text-sm">
                      {priceGroups.map((group) => (
                        <PriceGroupPreview key={group.priceGroup} group={group} />
                      ))}
                    </div>
                  </div>
                </div>

                {zone.slug === "vvip" ? (
                  <VvipZoneLayout onBoothClick={(booth) => openBooth(zone, booth)} zone={zone} />
                ) : zone.slug === "vip" ? (
                  <VipZoneLayout onBoothClick={(booth) => openBooth(zone, booth)} zone={zone} />
                ) : zone.slug === "premium" ? (
                  <PremiumZoneLayout
                    onBoothClick={(booth) => openBooth(zone, booth)}
                    zone={zone}
                  />
                ) : zone.slug === "festival-west" ? (
                  <FestivalWestZoneLayout
                    onBoothClick={(booth) => openBooth(zone, booth)}
                    zone={zone}
                  />
                ) : zone.slug === "festival-north" ? (
                  <FestivalNorthZoneLayout
                    onBoothClick={(booth) => openBooth(zone, booth)}
                    zone={zone}
                  />
                ) : (
                  <BoothCanvasLayout
                    onBoothClick={(booth) => openBooth(zone, booth)}
                    viewport={viewport}
                    zone={zone}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {boothEditor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-4 border-b border-border/70 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
                  Konfigurasi booth
                </p>
                <h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-primary-950">
                  {boothEditor.booth.code}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {boothEditor.zone.name}
                  {boothEditor.zone.location ? ` · ${boothEditor.zone.location}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-white text-primary-700 ring-1 ring-primary-100">
                    {boothEditor.booth.boothGroup.name}
                  </Badge>
                  <Badge className="bg-white text-muted-foreground ring-1 ring-border/70">
                    {boothEditor.booth.boothCategory.name}
                  </Badge>
                </div>
              </div>
              <button
                className="inline-flex size-10 items-center justify-center rounded-2xl border border-border/80 bg-white text-muted-foreground hover:bg-muted"
                onClick={() => setBoothEditor(null)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-3">
                {resolveZonePriceGroups(boothEditor.zone).map((group) => (
                  <PriceGroupPreview key={group.priceGroup} group={group} />
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Booth Group</span>
                  <select
                    className="mt-2 h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                    onChange={(event) =>
                      setBoothEditor((current) =>
                        current ? { ...current, boothGroupId: event.target.value } : current
                      )
                    }
                    value={boothEditor.boothGroupId}
                  >
                    {boothGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-foreground">Booth Category</span>
                  <select
                    className="mt-2 h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                    onChange={(event) =>
                      setBoothEditor((current) =>
                        current ? { ...current, boothCategoryId: event.target.value } : current
                      )
                    }
                    value={boothEditor.boothCategoryId}
                  >
                    {boothCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-foreground">Booth Status</span>
                  <select
                    className="mt-2 h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                    onChange={(event) =>
                      setBoothEditor((current) =>
                        current ? { ...current, status: event.target.value } : current
                      )
                    }
                    value={boothEditor.status}
                  >
                    <option value="open">Open</option>
                    <option value="booked">Booked</option>
                  </select>
                </label>
              </div>

              {boothEditor.status === "booked" ? (
                <div>
                  <label className="text-sm font-medium text-foreground" htmlFor="business-search">
                    Pilih perusahaan
                  </label>
                  <div className="mt-2">
                    <AutocompleteInput
                      id="business-search"
                      onValueChange={(value) =>
                        setBoothEditor((current) =>
                          current ? { ...current, businessLabel: value } : current
                        )
                      }
                      options={companyOptions.map((company) => company.label)}
                      placeholder="Cari perusahaan terdaftar..."
                      value={boothEditor.businessLabel}
                    />
                  </div>
                  <BoothBookingSummary
                    company={
                      companies.find(
                        (company) =>
                          company.id === companyLabelToId.get(boothEditor.businessLabel.trim())
                      ) ?? null
                    }
                  />
                </div>
              ) : null}

              {boothEditor.status === "booked" && companies.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Belum ada perusahaan terdaftar di data peserta.
                </div>
              ) : null}

              {boothEditorError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {boothEditorError}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 border-t border-border/70 pt-5">
                <Button variant="outline" onClick={() => setBoothEditor(null)} type="button">
                  Batal
                </Button>
                <Button
                  disabled={
                    isSaving ||
                    (boothEditor.status === "booked" &&
                      !companyLabelToId.has(boothEditor.businessLabel.trim()))
                  }
                  onClick={saveBoothEditor}
                  type="button"
                >
                  {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Simpan Booth
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {zoneEditor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-4 border-b border-border/70 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
                  Edit zona
                </p>
                <h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-primary-950">
                  {zoneEditor.zone.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {zoneEditor.mode === "facilities"
                    ? "Edit fasilitas untuk semua booth di zona ini."
                    : zoneEditor.mode === "prices"
                      ? "Edit harga untuk semua booth di zona ini."
                      : zoneEditor.mode === "location"
                        ? "Edit lokasi/area zona ini."
                        : "Upload atau pilih feature image untuk zona ini."}
                </p>
              </div>
              <button
                className="inline-flex size-10 items-center justify-center rounded-2xl border border-border/80 bg-white text-muted-foreground hover:bg-muted"
                onClick={() => setZoneEditor(null)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {zoneEditor.mode === "location" ? (
                <div>
                  <label className="text-sm font-medium text-foreground" htmlFor="location-editor">
                    Lokasi / Area
                  </label>
                  <input
                    className="mt-2 h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                    id="location-editor"
                    onChange={(event) =>
                      setZoneEditor((current) =>
                        current?.mode === "location"
                          ? { ...current, location: event.target.value }
                          : current
                      )
                    }
                    placeholder="Contoh: Area Aligard, bagian depan gedung Aligard"
                    value={zoneEditor.location}
                  />
                </div>
              ) : zoneEditor.mode === "facilities" ? (
                <div>
                  <label className="text-sm font-medium text-foreground" htmlFor="facilities-editor">
                    Fasilitas
                  </label>
                  <textarea
                    className="mt-2 min-h-40 w-full rounded-2xl border border-input bg-white px-3 py-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                    id="facilities-editor"
                    onChange={(event) =>
                      setZoneEditor((current) =>
                        current?.mode === "facilities"
                          ? { ...current, facilitiesText: event.target.value }
                          : current
                      )
                    }
                    placeholder="Satu fasilitas per baris"
                    value={zoneEditor.facilitiesText}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Gunakan format `Nama: nilai` jika fasilitas punya nilai khusus, misal `Ukuran:
                    2x2M`.
                  </p>
                </div>
              ) : zoneEditor.mode === "prices" ? (
                <div className="space-y-4">
                  {resolveZonePriceGroupsFromRows(zoneEditor.priceRows).map((group) => (
                    <div
                      className="rounded-2xl border border-border/70 bg-muted/20 p-4"
                      key={group.priceGroup}
                    >
                      <p className="text-sm font-semibold text-primary-900">
                        {formatPriceGroup(group.priceGroup)}
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        {group.rules.map((rule) => (
                          <NumberInput
                            key={`${rule.priceGroup}.${rule.pricePhase}`}
                            label={formatPricePhase(rule.pricePhase)}
                            onChange={(value) =>
                              setZoneEditor((current) =>
                                current?.mode === "prices"
                                  ? {
                                      ...current,
                                      priceRows: current.priceRows.map((row) =>
                                        row.priceGroup === rule.priceGroup &&
                                        row.pricePhase === rule.pricePhase
                                          ? { ...row, price: value }
                                          : row
                                      ),
                                    }
                                  : current
                              )
                            }
                            value={rule.price}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Feature Image Zona</label>
                  <MediaPicker
                    value={zoneEditor.image}
                    onChange={(image) =>
                      setZoneEditor((current) =>
                        current?.mode === "image" ? { ...current, image } : current
                      )
                    }
                    accept="image"
                    folder={`public/booth-zones/${zoneEditor.zone.slug}`}
                    visibility="public"
                    placeholder="Pilih atau upload gambar zona..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Gambar ini dipakai di section Tenant Zones pada landing page publik.
                  </p>
                </div>
              )}

              {editorError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {editorError}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 border-t border-border/70 pt-5">
                <Button
                  disabled={isSaving}
                  variant="outline"
                  onClick={() => setZoneEditor(null)}
                  type="button"
                >
                  Batal
                </Button>
                <Button disabled={isSaving} onClick={saveZoneEditor} type="button">
                  {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Simpan
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function BoothBookingSummary({ company }: { company: CompanyOption | null }) {
  if (!company) {
    return (
      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Pilih perusahaan terdaftar untuk melihat detail booking.
      </div>
    );
  }

  const productTags = Array.isArray(company.productTags) ? company.productTags : [];

  return (
    <div className="mt-3 rounded-2xl border border-primary-100 bg-primary-50/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
        Informasi booking
      </p>
      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
        <BookingInfoItem label="Nama yang booking" value={company.participantName} />
        <BookingInfoItem label="Nama perusahaan" value={company.companyName} />
        <BookingInfoItem
          label="Kategori produk"
          value={company.requestedBoothCategoryName ?? "-"}
        />
        <BookingInfoItem
          label="Produk yang dibawa"
          value={productTags.length > 0 ? productTags.join(", ") : "-"}
        />
      </div>
    </div>
  );
}

function BookingInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/80 p-3 ring-1 ring-primary-100/80">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-primary-950">{value}</p>
    </div>
  );
}

function VvipZoneLayout({
  onBoothClick,
  zone,
}: {
  onBoothClick: (booth: BoothMapBooth) => void;
  zone: BoothMapZone;
}) {
  const sortedBooths = [...zone.booths].sort(
    (first, second) => extractBoothNumber(first.code) - extractBoothNumber(second.code)
  );
  const leftBooths = sortedBooths.slice(0, 3);
  const rightBooths = sortedBooths.slice(3, 6);

  return (
    <div className="overflow-x-auto rounded-[30px] bg-slate-50 p-5 ring-1 ring-slate-200/90">
      <div className="grid min-w-[960px] grid-cols-[1fr_96px_1fr] items-stretch gap-4">
        <div className="grid grid-cols-3 gap-0">
          {leftBooths.map((booth) => (
            <VvipBoothCard key={booth.id} booth={booth} onClick={() => onBoothClick(booth)} />
          ))}
        </div>

        <div className="flex flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-300/90 bg-white/60 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Gangway
          </p>
          <div className="mt-3 h-16 w-px bg-slate-300" />
        </div>

        <div className="grid grid-cols-3 gap-0">
          {rightBooths.map((booth) => (
            <VvipBoothCard key={booth.id} booth={booth} onClick={() => onBoothClick(booth)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BoothCanvasLayout({
  onBoothClick,
  viewport,
  zone,
}: {
  onBoothClick: (booth: BoothMapBooth) => void;
  viewport: ReturnType<typeof resolveViewport>;
  zone: BoothMapZone;
}) {
  return (
    <div className="rounded-[28px] bg-slate-100/80 p-4 ring-1 ring-slate-200/80">
      <div className={viewport.wrapperClassName}>
        <div
          className="relative"
          style={{
            height: viewport.height,
            width: viewport.width,
          }}
        >
          {zone.booths.map((booth) => (
            <GenericBoothCard
              booth={booth}
              key={booth.id}
              onClick={() => onBoothClick(booth)}
              style={{
                height: booth.height ?? 42,
                left: booth.x ?? 0,
                top: booth.y ?? 0,
                width: booth.width ?? 84,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function VipZoneLayout({
  onBoothClick,
  zone,
}: {
  onBoothClick: (booth: BoothMapBooth) => void;
  zone: BoothMapZone;
}) {
  const sortedBooths = [...zone.booths].sort(
    (first, second) => extractBoothNumber(first.code) - extractBoothNumber(second.code)
  );
  const rows = [sortedBooths.slice(0, 6), sortedBooths.slice(6, 12)];

  return (
    <div className="overflow-x-auto rounded-[30px] bg-slate-50 p-5 ring-1 ring-slate-200/90">
      <div className="grid min-w-[980px] gap-5">
        {rows.map((row, rowIndex) => (
          <div
            className="grid grid-cols-[1fr_96px_1fr] items-stretch gap-4"
            key={`vip-row-${rowIndex + 1}`}
          >
            <div className="grid grid-cols-3 gap-0">
              {row.slice(0, 3).map((booth) => (
                <VipBoothCard key={booth.id} booth={booth} onClick={() => onBoothClick(booth)} />
              ))}
            </div>

            <div className="flex flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-300/90 bg-white/60 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Gangway
              </p>
              <div className="mt-3 h-16 w-px bg-slate-300" />
            </div>

            <div className="grid grid-cols-3 gap-0">
              {row.slice(3, 6).map((booth) => (
                <VipBoothCard key={booth.id} booth={booth} onClick={() => onBoothClick(booth)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PremiumZoneLayout({
  onBoothClick,
  zone,
}: {
  onBoothClick: (booth: BoothMapBooth) => void;
  zone: BoothMapZone;
}) {
  const sortedBooths = [...zone.booths].sort(
    (first, second) => extractBoothNumber(first.code) - extractBoothNumber(second.code)
  );
  const col1 = sortedBooths.slice(0, 7);
  const col2 = sortedBooths.slice(7, 14);
  const col3 = sortedBooths.slice(14, 21);
  const col4 = sortedBooths.slice(21, 28);

  return (
    <div className="overflow-x-auto rounded-[30px] bg-slate-50 p-5 ring-1 ring-slate-200/90">
      <div className="flex min-w-[640px] justify-center gap-10">
        <PremiumSection colA={col1} colB={col2} onBoothClick={onBoothClick} />
        <PremiumSection colA={col3} colB={col4} onBoothClick={onBoothClick} />
      </div>
    </div>
  );
}

function PremiumColumnStrip({
  booths,
  onBoothClick,
}: {
  booths: BoothMapBooth[];
  onBoothClick: (booth: BoothMapBooth) => void;
}) {
  const top = booths.slice(0, 3);
  const bottom = booths.slice(3, 7);
  return (
    <div className="flex flex-col">
      <div className="grid gap-0">
        {top.map((booth) => (
          <VipBoothCard
            className="first:rounded-t-[20px]"
            key={booth.id}
            booth={booth}
            onClick={() => onBoothClick(booth)}
          />
        ))}
      </div>
      <div className="flex h-7 items-center px-2">
        <div className="w-full border-b border-dashed border-slate-300" />
      </div>
      <div className="grid gap-0">
        {bottom.map((booth) => (
          <VipBoothCard
            className="last:rounded-b-[20px]"
            key={booth.id}
            booth={booth}
            onClick={() => onBoothClick(booth)}
          />
        ))}
      </div>
    </div>
  );
}

function PremiumSection({
  colA,
  colB,
  onBoothClick,
}: {
  colA: BoothMapBooth[];
  colB: BoothMapBooth[];
  onBoothClick: (booth: BoothMapBooth) => void;
}) {
  return (
    <div className="flex items-stretch">
      <PremiumColumnStrip booths={colA} onBoothClick={onBoothClick} />
      <div className="flex w-12 items-center justify-center border-x border-dashed border-slate-300 bg-white/60">
        <p className="rotate-180 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 [writing-mode:vertical-rl]">
          Gangway
        </p>
      </div>
      <PremiumColumnStrip booths={colB} onBoothClick={onBoothClick} />
    </div>
  );
}

function FestivalWestZoneLayout({
  onBoothClick,
  zone,
}: {
  onBoothClick: (booth: BoothMapBooth) => void;
  zone: BoothMapZone;
}) {
  const sortedBooths = [...zone.booths].sort(
    (first, second) => extractBoothNumber(first.code) - extractBoothNumber(second.code)
  );
  const rightTop = sortedBooths.slice(0, 5);
  const block1 = sortedBooths.slice(5, 10);
  const block2 = sortedBooths.slice(10, 15);
  const block3 = sortedBooths.slice(15, 21);
  const block4 = sortedBooths.slice(21, 27);

  const gangway = (
    <div className="flex h-7 items-center px-2">
      <div className="w-full border-b border-dashed border-slate-300" />
    </div>
  );

  function BoothBlock({ booths }: { booths: BoothMapBooth[] }) {
    return (
      <div className="grid gap-0">
        {booths.map((booth) => (
          <VipBoothCard
            className="first:rounded-t-[20px] last:rounded-b-[20px]"
            key={booth.id}
            booth={booth}
            onClick={() => onBoothClick(booth)}
            sizeClassName="min-h-[72px] min-w-[82px]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-[30px] bg-slate-50 p-5 ring-1 ring-slate-200/90">
      <div className="mx-auto max-h-[700px] w-[178px] overflow-y-auto rounded-[24px]">
        <div className="flex w-[178px] flex-col">
          <div className="self-end grid gap-0">
            {rightTop.map((booth) => (
              <VipBoothCard
                className="first:rounded-t-[20px] last:rounded-b-[20px]"
                key={booth.id}
                booth={booth}
                onClick={() => onBoothClick(booth)}
                sizeClassName="min-h-[72px] min-w-[82px]"
              />
            ))}
          </div>
          <div className="self-start">
            <BoothBlock booths={block1} />
            {gangway}
            <BoothBlock booths={block2} />
            {gangway}
            <BoothBlock booths={block3} />
            <div className="h-8" />
            <BoothBlock booths={block4} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FestivalNorthZoneLayout({
  onBoothClick,
  zone,
}: {
  onBoothClick: (booth: BoothMapBooth) => void;
  zone: BoothMapZone;
}) {
  const sortedBooths = [...zone.booths].sort(
    (first, second) => extractBoothNumber(first.code) - extractBoothNumber(second.code)
  );
  const blocks = Array.from({ length: Math.ceil(sortedBooths.length / 5) }, (_, blockIndex) =>
    sortedBooths.slice(blockIndex * 5, blockIndex * 5 + 5)
  );

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef({ active: false, startX: 0, scrollLeft: 0 });

  function onMouseDown(e: React.MouseEvent) {
    drag.current = { active: true, startX: e.pageX, scrollLeft: scrollRef.current?.scrollLeft ?? 0 };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current.active || !scrollRef.current) return;
    e.preventDefault();
    scrollRef.current.scrollLeft = drag.current.scrollLeft - (e.pageX - drag.current.startX);
  }
  function onDragEnd() { drag.current.active = false; }

  return (
    <div className="rounded-[30px] bg-slate-50 p-5 ring-1 ring-slate-200/90">
      <div
        ref={scrollRef}
        className="mx-auto h-[172px] w-full max-w-[980px] cursor-grab overflow-x-auto overflow-y-hidden rounded-[24px] select-none active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
      >
        <div className="flex w-max gap-6">
          {blocks.map((block, blockIndex) => (
            <div className="flex gap-0" key={`festival-north-block-${blockIndex + 1}`}>
              {block.map((booth) => (
                <VipBoothCard
                  className="first:rounded-l-[20px] last:rounded-r-[20px]"
                  key={booth.id}
                  booth={booth}
                  onClick={() => onBoothClick(booth)}
                  sizeClassName="min-h-[82px] min-w-[82px]"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VvipBoothCard({
  booth,
  onClick,
}: {
  booth: BoothMapBooth;
  onClick: () => void;
}) {
  const isBooked = booth.status === "booked";
  const boothNumber = extractBoothNumber(booth.code);

  return (
    <button
      className="group flex min-h-[92px] flex-col justify-between rounded-none border border-slate-300 bg-white p-3 text-left shadow-none transition first:rounded-l-[20px] last:rounded-r-[20px] hover:z-10 hover:-translate-y-0.5 hover:border-primary-300 hover:bg-slate-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-100"
      onClick={onClick}
      type="button"
    >
      <div className="flex justify-end">
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
            isBooked
              ? "bg-slate-200 text-slate-700"
              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          }`}
        >
          {isBooked ? "Booked" : "Open"}
        </span>
      </div>

      <div>
        <p className="text-sm font-semibold tracking-[-0.03em] text-slate-950">
          VVIP {boothNumber}
        </p>
      </div>
    </button>
  );
}

function VipBoothCard({
  className,
  booth,
  onClick,
  sizeClassName,
}: {
  className?: string;
  booth: BoothMapBooth;
  onClick: () => void;
  sizeClassName?: string;
}) {
  const isBooked = booth.status === "booked";

  return (
    <button
      className={`group flex ${sizeClassName ?? "min-h-[92px] min-w-[92px]"} flex-col justify-between rounded-none border border-slate-300 bg-white p-3 text-left shadow-none transition hover:z-10 hover:-translate-y-0.5 hover:border-primary-300 hover:bg-slate-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-100 ${
        className ?? "first:rounded-l-[20px] last:rounded-r-[20px]"
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="flex justify-end">
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
            isBooked
              ? "bg-slate-200 text-slate-700"
              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          }`}
        >
          {isBooked ? "Booked" : "Open"}
        </span>
      </div>

      <div>
        <p className="text-xs font-semibold tracking-[-0.02em] text-slate-950">{booth.code}</p>
      </div>
    </button>
  );
}

function GenericBoothCard({
  booth,
  onClick,
  style,
}: {
  booth: BoothMapBooth;
  onClick: () => void;
  style: React.CSSProperties;
}) {
  const isBooked = booth.status === "booked";

  return (
    <button
      className="group absolute rounded-[14px] border border-slate-300 bg-white text-left shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition hover:z-10 hover:-translate-y-0.5 hover:border-primary-300 hover:bg-slate-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-100"
      onClick={onClick}
      style={style}
      type="button"
    >
      <span
        className={`absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[8px] font-semibold ${
          isBooked
            ? "bg-slate-200 text-slate-700"
            : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
        }`}
      >
        {isBooked ? "Booked" : "Open"}
      </span>

      <div className="absolute bottom-1.5 left-2">
        <p className="text-[10px] font-semibold leading-none tracking-[-0.02em] text-slate-950">
          {booth.code}
        </p>
      </div>
    </button>
  );
}

function resolveBoothFill(booth: {
  boothGroup: {
    slug: string;
  };
  notes: string | null;
  status: string;
}) {
  if (booth.status === "booked") {
    switch (booth.boothGroup.slug) {
      case "sponsor":
        return "#fbbf24";
      case "fpag":
        return "#fef08a";
      case "formaqin":
        return "#7c3aed";
      case "gontor":
        return "#22c55e";
      case "forbis":
        return "#2563eb";
      default:
        return "#60a5fa";
    }
  }

  if (booth.notes?.toLowerCase().includes("available highlight")) {
    return "#bfdbfe";
  }

  return "#ffffff";
}

function resolveBoothTextColor(booth: { status: string }) {
  return booth.status === "booked" ? "#dc2626" : "#0f172a";
}

function resolveViewport(zone: BoothMapZone) {
  const rightMost = Math.max(
    ...zone.booths.map((booth) => (booth.x ?? 0) + (booth.width ?? 84)),
    0
  );
  const bottomMost = Math.max(
    ...zone.booths.map((booth) => (booth.y ?? 0) + (booth.height ?? 42)),
    0
  );

  return {
    height: bottomMost + 48,
    width: rightMost + 48,
    wrapperClassName:
      zone.slug === "festival-north"
        ? "mx-auto h-[172px] w-full max-w-[980px] overflow-x-auto overflow-y-hidden rounded-[24px]"
        : zone.slug.startsWith("festival")
          ? "h-[560px] overflow-auto"
          : "overflow-x-auto",
  };
}

function formatCurrency(value?: number | null) {
  if (!value) {
    return "-";
  }

  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatPriceGroup(priceGroup: string) {
  switch (priceGroup) {
    case "forbis":
      return "FORBIS";
    case "public":
      return "Umum";
    case "sponsor":
      return "Sponsor";
    default:
      return priceGroup;
  }
}

function formatPricePhase(pricePhase: string) {
  switch (pricePhase) {
    case "early_bird":
      return "Early bird";
    case "pre_sale":
      return "Pre-sale";
    case "regular":
      return "Regular";
    default:
      return pricePhase;
  }
}

function resolveZoneFacilities(zone: BoothMapZone) {
  const facilityMap = new Map<string, string>();

  for (const booth of zone.booths) {
    for (const facility of booth.facilities) {
      facilityMap.set(facility.toLocaleLowerCase("id-ID"), facility);
    }
  }

  return [...facilityMap.values()];
}

const PRICE_PHASE_ORDER = ["early_bird", "pre_sale", "regular"];
const PRICE_GROUP_ORDER = ["sponsor", "forbis", "public"];

function resolveZonePriceGroups(zone: BoothMapZone) {
  return resolveZonePriceGroupsFromRows(
    zone.priceRules.map((rule) => ({
      price: String(rule.price),
      priceGroup: rule.priceGroup,
      pricePhase: rule.pricePhase,
    }))
  );
}

function resolveZonePriceGroupsFromRows(
  rows: Array<{
    price: string;
    priceGroup: string;
    pricePhase: string;
  }>
) {
  const groups = new Map<
    string,
    Array<{ price: string; priceGroup: string; pricePhase: string }>
  >();

  for (const row of rows) {
    const currentRows = groups.get(row.priceGroup) ?? [];
    currentRows.push(row);
    groups.set(row.priceGroup, currentRows);
  }

  return [...groups.entries()]
    .sort(
      ([firstGroup], [secondGroup]) =>
        PRICE_GROUP_ORDER.indexOf(firstGroup) - PRICE_GROUP_ORDER.indexOf(secondGroup)
    )
    .map(([priceGroup, rules]) => ({
      priceGroup,
      rules: rules.sort(
        (first, second) =>
          PRICE_PHASE_ORDER.indexOf(first.pricePhase) -
          PRICE_PHASE_ORDER.indexOf(second.pricePhase)
      ),
    }));
}

function buildEditablePriceRows(zone: BoothMapZone) {
  const groups = zone.slug === "vvip" ? ["sponsor", "forbis", "public"] : ["forbis", "public"];

  return groups.flatMap((priceGroup) =>
    PRICE_PHASE_ORDER.map((pricePhase) => {
      const existingRule = zone.priceRules.find(
        (rule) => rule.priceGroup === priceGroup && rule.pricePhase === pricePhase
      );

      return {
        price: String(existingRule?.price ?? 0),
        priceGroup,
        pricePhase,
      };
    })
  );
}

function extractBoothNumber(code: string) {
  return Number(code.match(/\d+/)?.[0] ?? 0);
}

function PriceLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/30 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-semibold text-primary-900">{value}</p>
    </div>
  );
}

function PriceGroupPreview({
  group,
}: {
  group: {
    priceGroup: string;
    rules: Array<{ price: string; priceGroup: string; pricePhase: string }>;
  };
}) {
  return (
    <div className="rounded-xl bg-muted/30 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {formatPriceGroup(group.priceGroup)}
      </p>
      <div className="mt-2 grid gap-1.5">
        {group.rules.map((rule) => (
          <div className="flex items-center justify-between gap-3 text-xs" key={rule.pricePhase}>
            <span className="text-muted-foreground">{formatPricePhase(rule.pricePhase)}</span>
            <span className="font-semibold text-primary-900">
              {formatCurrency(Number(rule.price))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NumberInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
        min={0}
        onChange={(event) => onChange(event.target.value)}
        type="number"
        value={value}
      />
    </label>
  );
}
