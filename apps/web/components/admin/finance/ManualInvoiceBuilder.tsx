"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { createManualInvoice } from "@/actions/finance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionAutocompleteSelect } from "@/components/forms/OptionAutocompleteSelect";
import { isBoothEligible } from "@/lib/booth-eligibility";

type BuilderData = {
  invoiceDueDays: number;
  addons: Array<{
    description: string | null;
    id: string;
    name: string;
    price: number;
    unitName: string | null;
  }>;
  booths: Array<{
    boothCategorySlug: string;
    boothGroupDefaultPriceGroup: string | null;
    boothGroupName: string;
    boothGroupSlug: string;
    code: string;
    id: string;
    priceRules: Array<{
      endsAt: string | null;
      price: number;
      priceGroup: string;
      pricePhase: string;
      startsAt: string | null;
    }>;
    status: string;
    zoneColorCode: string | null;
    zoneName: string;
    zoneSlug: string;
  }>;
  currentPricePhase: string;
  participants: Array<{
    businesses: Array<{
      companyName: string;
      id: string;
      requestedBoothCategorySlug: string | null;
    }>;
    id: string;
    isForbisMember: boolean;
    name: string;
    organizationGroupSlug: string | null;
  }>;
};

type CustomItem = {
  description: string;
  quantity: number;
  title: string;
  unitPrice: number;
};

export function ManualInvoiceBuilder({ data }: { data: BuilderData }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [dueDays, setDueDays] = React.useState(data.invoiceDueDays ?? 1);
  const [activeZone, setActiveZone] = React.useState<string>("all");
  const [participantId, setParticipantId] = React.useState("");
  const [businessId, setBusinessId] = React.useState("");
  const [selectedBoothIds, setSelectedBoothIds] = React.useState<string[]>([]);
  const [selectedAddonQuantities, setSelectedAddonQuantities] = React.useState<
    Record<string, number>
  >({});
  const [customItems, setCustomItems] = React.useState<CustomItem[]>([
    { description: "", quantity: 1, title: "", unitPrice: 0 },
  ]);

  const selectedParticipant = React.useMemo(
    () => data.participants.find((participant) => participant.id === participantId) ?? null,
    [data.participants, participantId]
  );

  const availableBusinesses = selectedParticipant?.businesses ?? [];
  const selectedBusiness = availableBusinesses.find((business) => business.id === businessId) ?? null;

  React.useEffect(() => {
    if (selectedParticipant && businessId && !availableBusinesses.some((business) => business.id === businessId)) {
      setBusinessId("");
    }
  }, [availableBusinesses, businessId, selectedParticipant]);


  const boothCatalog = React.useMemo(
    () =>
      data.booths
        .filter((booth) => booth.status === "open")
        .filter((booth) => {
          if (!selectedParticipant || !selectedBusiness) return true;
          return isBoothEligible({
            booth: { boothCategorySlug: booth.boothCategorySlug, boothGroupSlug: booth.boothGroupSlug },
            business: { requestedBoothCategorySlug: selectedBusiness.requestedBoothCategorySlug },
            participant: { organizationGroupSlug: selectedParticipant.organizationGroupSlug },
          });
        })
        .map((booth) => {
          const priceGroup = resolvePriceGroup({
            boothGroupSlug: booth.boothGroupSlug,
            defaultPriceGroup: booth.boothGroupDefaultPriceGroup,
            isForbisMember: selectedParticipant?.isForbisMember ?? false,
          });
          const resolvedPrice = resolveBoothPrice(booth.priceRules, priceGroup, data.currentPricePhase);

          return {
            ...booth,
            price: resolvedPrice.price,
            priceGroup,
            pricePhase: resolvedPrice.phase,
          };
        }),
    [data.booths, data.currentPricePhase, selectedBusiness, selectedParticipant]
  );

  // Deselect booths that are no longer in the catalog (eligibility changed)
  React.useEffect(() => {
    const eligibleIds = new Set(boothCatalog.map((b) => b.id));
    setSelectedBoothIds((prev) => prev.filter((id) => eligibleIds.has(id)));
  }, [boothCatalog]);

  const selectedBoothItems = boothCatalog.filter((booth) => selectedBoothIds.includes(booth.id));
  const selectedAddonItems = data.addons
    .filter((addon) => (selectedAddonQuantities[addon.id] ?? 0) > 0)
    .map((addon) => ({
      ...addon,
      quantity: selectedAddonQuantities[addon.id] ?? 0,
      subtotal: addon.price * (selectedAddonQuantities[addon.id] ?? 0),
    }));
  const validCustomItems = customItems.filter(
    (item) => item.title.trim() && item.quantity > 0 && item.unitPrice >= 0
  );

  const subtotal =
    selectedBoothItems.reduce((sum, booth) => sum + booth.price, 0) +
    selectedAddonItems.reduce((sum, addon) => sum + addon.subtotal, 0) +
    validCustomItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  function toggleBooth(boothId: string) {
    setSelectedBoothIds((current) =>
      current.includes(boothId)
        ? current.filter((value) => value !== boothId)
        : [...current, boothId]
    );
  }

  function toggleAddon(addonId: string, checked: boolean) {
    setSelectedAddonQuantities((current) => ({
      ...current,
      [addonId]: checked ? Math.max(current[addonId] ?? 1, 1) : 0,
    }));
  }

  function updateAddonQuantity(addonId: string, value: number) {
    setSelectedAddonQuantities((current) => ({
      ...current,
      [addonId]: Math.max(value, 0),
    }));
  }

  function addCustomItem() {
    setCustomItems((current) => [
      ...current,
      { description: "", quantity: 1, title: "", unitPrice: 0 },
    ]);
  }

  function removeCustomItem(index: number) {
    setCustomItems((current) =>
      current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function updateCustomItem(index: number, field: keyof CustomItem, value: string | number) {
    setCustomItems((current) => {
      const next = [...current];
      next[index] = { ...next[index], [field]: value } as CustomItem;
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (selectedBoothIds.length > 0 || selectedAddonItems.length > 0) {
      if (!participantId || !businessId) {
        setError("Pilih peserta dan perusahaan untuk transaksi booth atau add-on.");
        return;
      }
    }

    if (subtotal <= 0) {
      setError("Minimal pilih satu booth, add-on, atau item manual.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createManualInvoice({
        businessId: businessId || undefined,
        customItems: validCustomItems.map((item) => ({
          ...item,
          itemType: "custom",
        })),
        dueDays,
        participantId: participantId || undefined,
        selectedAddons: selectedAddonItems.map((addon) => ({
          addonId: addon.id,
          quantity: addon.quantity,
        })),
        selectedBoothIds,
      });

      if (!result.success) {
        setError(result.error ?? "Gagal membuat transaksi.");
        return;
      }

      router.push("/admin/keuangan");
      router.refresh();
    } catch (submitError) {
      setError("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mx-auto max-w-6xl space-y-6" onSubmit={handleSubmit}>
      <div className="flex items-center gap-4">
        <Link href="/admin/keuangan">
          <Button size="icon" type="button" variant="outline">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <p className="text-sm text-muted-foreground">
          Pilih peserta dan perusahaan dulu, lalu tambahkan booth, add-on, atau item manual.
        </p>
      </div>

      <Card className="border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle>Identitas Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FieldBlock label="Peserta">
            <OptionAutocompleteSelect
              onValueChange={(value) => setParticipantId(value)}
              options={data.participants.map((p) => ({ id: p.id, label: p.name }))}
              placeholder="Cari nama peserta"
              value={participantId}
            />
          </FieldBlock>

          <FieldBlock label="Perusahaan">
            <OptionAutocompleteSelect
              disabled={!participantId}
              onValueChange={(value) => setBusinessId(value)}
              options={availableBusinesses.map((b) => ({ id: b.id, label: b.companyName }))}
              placeholder={participantId ? "Cari nama perusahaan" : "Pilih peserta dulu"}
              value={businessId}
            />
          </FieldBlock>

          <FieldBlock label="Jatuh Tempo (hari)">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={90}
                value={dueDays}
                onChange={(e) => setDueDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">hari sejak terbit</span>
            </div>
          </FieldBlock>
        </CardContent>
      </Card>

      <Card className="border-white/80 bg-white/90">
        <CardHeader className="border-b border-border/60">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Pilih Booth</CardTitle>
              {selectedBoothIds.length > 0 && (
                <p className="mt-0.5 text-sm text-primary-700 font-medium">{selectedBoothIds.length} booth dipilih</p>
              )}
            </div>
          </div>
          {/* Zone filter tabs */}
          <ZoneFilterTabs
            booths={boothCatalog}
            activeZone={activeZone}
            onZoneChange={(z) => setActiveZone(z)}
          />
        </CardHeader>
        <CardContent className="pt-5">
          <BoothGrid
            booths={boothCatalog}
            activeZone={activeZone}
            selectedBoothIds={selectedBoothIds}
            onToggle={toggleBooth}
          />
        </CardContent>
      </Card>

      <Card className="border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle>Pilih Add-on</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.addons.map((addon) => {
            const quantity = selectedAddonQuantities[addon.id] ?? 0;
            const checked = quantity > 0;

            return (
              <div
                key={addon.id}
                className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[1fr_120px] ${
                  checked
                    ? "border-primary/30 bg-primary/10"
                    : "border-border/70 bg-white"
                }`}
              >
                <label className="flex items-start gap-3">
                  <input
                    checked={checked}
                    className="mt-1"
                    onChange={(event) => toggleAddon(addon.id, event.target.checked)}
                    type="checkbox"
                  />
                  <div>
                    <p className="font-medium text-foreground">{addon.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[addon.description, addon.unitName].filter(Boolean).join(" • ") || "-"}
                    </p>
                    <p className="mt-1 text-sm font-medium text-primary-700">
                      {formatRupiah(addon.price)}
                    </p>
                  </div>
                </label>

                <div className="space-y-2">
                  <Label>Qty</Label>
                  <Input
                    disabled={!checked}
                    min={0}
                    onChange={(event) =>
                      updateAddonQuantity(addon.id, Number(event.target.value) || 0)
                    }
                    type="number"
                    value={checked ? quantity : 0}
                  />
                </div>
              </div>
            );
          })}
          {data.addons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-6 text-sm text-muted-foreground">
              Belum ada add-on aktif.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-white/80 bg-white/90">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Item Manual Opsional</CardTitle>
          <Button className="gap-2" onClick={addCustomItem} type="button" variant="outline">
            <Plus className="h-4 w-4" />
            Tambah Baris
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {customItems.map((item, index) => (
            <div key={index} className="grid gap-4 rounded-2xl border border-border/70 p-4 md:grid-cols-12">
              <div className="space-y-2 md:col-span-5">
                <Label>Judul Item</Label>
                <Input
                  onChange={(event) => updateCustomItem(index, "title", event.target.value)}
                  placeholder="Misal: Biaya branding tambahan"
                  value={item.title}
                />
                <Input
                  className="text-sm"
                  onChange={(event) =>
                    updateCustomItem(index, "description", event.target.value)
                  }
                  placeholder="Catatan tambahan"
                  value={item.description}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Kuantitas</Label>
                <Input
                  min={1}
                  onChange={(event) =>
                    updateCustomItem(index, "quantity", Number(event.target.value) || 0)
                  }
                  type="number"
                  value={item.quantity}
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label>Harga Satuan</Label>
                <Input
                  min={0}
                  onChange={(event) =>
                    updateCustomItem(index, "unitPrice", Number(event.target.value) || 0)
                  }
                  type="number"
                  value={item.unitPrice}
                />
              </div>
              <div className="flex items-end justify-center md:col-span-2">
                <Button
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={customItems.length === 1}
                  onClick={() => removeCustomItem(index)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t bg-muted/20 p-6">
          <span className="text-lg font-semibold">Total Tagihan</span>
          <span className="text-2xl font-bold">{formatRupiah(subtotal)}</span>
        </CardFooter>
      </Card>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-3">
        <Link href="/admin/keuangan">
          <Button type="button" variant="ghost">
            Batal
          </Button>
        </Link>
        <Button disabled={isSubmitting || subtotal <= 0} type="submit">
          {isSubmitting ? "Menerbitkan..." : "Terbitkan Tagihan"}
        </Button>
      </div>
    </form>
  );
}

type BoothItem = {
  boothGroupName: string;
  code: string;
  id: string;
  price: number;
  priceGroup: string;
  zoneColorCode: string | null;
  zoneName: string;
  zoneSlug: string;
};

function ZoneFilterTabs({
  booths,
  activeZone,
  onZoneChange,
}: {
  booths: BoothItem[];
  activeZone: string;
  onZoneChange: (zone: string) => void;
}) {
  const zones = React.useMemo(() => {
    const map = new Map<string, { name: string; slug: string; colorCode: string | null; count: number }>();
    for (const b of booths) {
      const existing = map.get(b.zoneSlug);
      if (existing) { existing.count++; }
      else { map.set(b.zoneSlug, { name: b.zoneName, slug: b.zoneSlug, colorCode: b.zoneColorCode, count: 1 }); }
    }
    return [...map.values()];
  }, [booths]);

  if (zones.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onZoneChange("all")}
        className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
          activeZone === "all"
            ? "bg-primary text-white"
            : "border border-border/70 bg-white text-muted-foreground hover:bg-muted/50"
        }`}
      >
        Semua ({booths.length})
      </button>
      {zones.map((zone) => (
        <button
          key={zone.slug}
          type="button"
          onClick={() => onZoneChange(zone.slug)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
            activeZone === zone.slug
              ? "bg-primary text-white"
              : "border border-border/70 bg-white text-muted-foreground hover:bg-muted/50"
          }`}
        >
          {zone.colorCode && (
            <span
              className="inline-block size-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: zone.colorCode }}
            />
          )}
          {zone.name} ({zone.count})
        </button>
      ))}
    </div>
  );
}

function BoothGrid({
  booths,
  activeZone,
  selectedBoothIds,
  onToggle,
}: {
  booths: BoothItem[];
  activeZone: string;
  selectedBoothIds: string[];
  onToggle: (id: string) => void;
}) {
  const filtered = activeZone === "all" ? booths : booths.filter((b) => b.zoneSlug === activeZone);

  // Group by zone for "all" view
  const grouped = React.useMemo(() => {
    if (activeZone !== "all") return null;
    const map = new Map<string, { name: string; colorCode: string | null; booths: BoothItem[] }>();
    for (const b of filtered) {
      const existing = map.get(b.zoneSlug);
      if (existing) { existing.booths.push(b); }
      else { map.set(b.zoneSlug, { name: b.zoneName, colorCode: b.zoneColorCode, booths: [b] }); }
    }
    return [...map.values()];
  }, [activeZone, filtered]);

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
        Tidak ada booth tersedia{activeZone !== "all" ? " di zona ini" : ""}.
      </div>
    );
  }

  if (grouped) {
    return (
      <div className="space-y-5">
        {grouped.map((zone) => (
          <div key={zone.name}>
            <div className="mb-2 flex items-center gap-2">
              {zone.colorCode && (
                <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: zone.colorCode }} />
              )}
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{zone.name}</p>
            </div>
            <BoothList booths={zone.booths} selectedBoothIds={selectedBoothIds} onToggle={onToggle} />
          </div>
        ))}
      </div>
    );
  }

  return <BoothList booths={filtered} selectedBoothIds={selectedBoothIds} onToggle={onToggle} />;
}

function BoothList({
  booths,
  selectedBoothIds,
  onToggle,
}: {
  booths: BoothItem[];
  selectedBoothIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {booths.map((booth) => {
        const checked = selectedBoothIds.includes(booth.id);
        return (
          <label
            key={booth.id}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
              checked ? "border-primary/30 bg-primary/10" : "border-border/70 bg-white hover:border-primary/20"
            }`}
          >
            <input checked={checked} className="mt-1" onChange={() => onToggle(booth.id)} type="checkbox" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{booth.code}</p>
              <p className="text-xs text-muted-foreground">{booth.boothGroupName}</p>
              <p className="mt-1 text-sm font-medium text-primary-700">
                {formatRupiah(booth.price)} · {formatPriceGroupLabel(booth.priceGroup)}
              </p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

function FieldBlock({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function resolvePriceGroup({
  boothGroupSlug,
  defaultPriceGroup,
  isForbisMember,
}: {
  boothGroupSlug: string;
  defaultPriceGroup: string | null;
  isForbisMember: boolean;
}) {
  if (boothGroupSlug === "gontor") return "gontor";

  if (boothGroupSlug === "general") {
    return isForbisMember ? "forbis" : "public";
  }

  return defaultPriceGroup ?? (isForbisMember ? "forbis" : "public");
}

function resolveBoothPrice(
  priceRules: Array<{
    endsAt: string | null;
    price: number;
    priceGroup: string;
    pricePhase: string;
    startsAt: string | null;
  }>,
  priceGroup: string,
  currentPhase: string
) {
  if (priceGroup === "gontor") return { phase: "free", price: 0 };

  const activeRule = priceRules.find(
    (rule) => rule.priceGroup === priceGroup && rule.pricePhase === currentPhase
  );

  if (activeRule) {
    return { phase: activeRule.pricePhase, price: activeRule.price };
  }

  // Fallback to regular if currentPhase rule not found
  const regularRule = priceRules.find(
    (rule) => rule.priceGroup === priceGroup && rule.pricePhase === "regular"
  );

  return {
    phase: regularRule?.pricePhase ?? "regular",
    price: regularRule?.price ?? 0,
  };
}

function formatPriceGroupLabel(value: string) {
  if (value === "forbis") return "Harga Forbis";
  if (value === "public") return "Harga Umum";
  if (value === "sponsor") return "Harga Sponsor";
  return value;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
