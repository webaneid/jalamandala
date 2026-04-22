"use client";

import * as React from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  deleteAddonUnit,
  deleteEventAddon,
  upsertAddonUnit,
  upsertEventAddon,
} from "@/actions/addons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AddonUnitItem = {
  description: string | null;
  id: string;
  isActive: boolean;
  name: string;
  slug: string;
};

type AddonItem = {
  addonUnitId: string | null;
  description: string | null;
  id: string;
  isActive: boolean;
  price: number;
  vendorPrice: number | null;
  title: string;
  unitName: string | null;
};

type UnitEditorState = {
  description: string;
  id?: string;
  isActive: boolean;
  name: string;
} | null;

type AddonEditorState = {
  addonUnitId: string;
  description: string;
  id?: string;
  isActive: boolean;
  price: string;
  vendorPrice: string;
  title: string;
} | null;

export function AddonConfiguration({
  addons,
  units,
}: {
  addons: AddonItem[];
  units: AddonUnitItem[];
}) {
  const router = useRouter();
  const [isSaving, startSaving] = React.useTransition();
  const [unitEditor, setUnitEditor] = React.useState<UnitEditorState>(null);
  const [addonEditor, setAddonEditor] = React.useState<AddonEditorState>(null);
  const [unitError, setUnitError] = React.useState("");
  const [addonError, setAddonError] = React.useState("");

  function openCreateUnit() {
    setUnitError("");
    setUnitEditor({
      description: "",
      isActive: true,
      name: "",
    });
  }

  function openEditUnit(unit: AddonUnitItem) {
    setUnitError("");
    setUnitEditor({
      description: unit.description ?? "",
      id: unit.id,
      isActive: unit.isActive,
      name: unit.name,
    });
  }

  function openCreateAddon() {
    setAddonError("");
    setAddonEditor({
      addonUnitId: units.find((unit) => unit.isActive)?.id ?? "",
      description: "",
      isActive: true,
      price: "",
      vendorPrice: "",
      title: "",
    });
  }

  function openEditAddon(addon: AddonItem) {
    setAddonError("");
    setAddonEditor({
      addonUnitId: addon.addonUnitId ?? "",
      description: addon.description ?? "",
      id: addon.id,
      isActive: addon.isActive,
      price: String(addon.price),
      vendorPrice: addon.vendorPrice != null ? String(addon.vendorPrice) : "",
      title: addon.title,
    });
  }

  function saveUnit() {
    if (!unitEditor) {
      return;
    }

    setUnitError("");
    startSaving(async () => {
      const result = await upsertAddonUnit({
        description: unitEditor.description,
        id: unitEditor.id,
        isActive: unitEditor.isActive,
        name: unitEditor.name,
      });

      if (!result.success) {
        setUnitError(result.error ?? "Gagal menyimpan satuan.");
        return;
      }

      setUnitEditor(null);
      router.refresh();
    });
  }

  function saveAddon() {
    if (!addonEditor) {
      return;
    }

    setAddonError("");
    startSaving(async () => {
      const result = await upsertEventAddon({
        addonUnitId: addonEditor.addonUnitId,
        description: addonEditor.description,
        id: addonEditor.id,
        isActive: addonEditor.isActive,
        price: Number(addonEditor.price),
        vendorPrice: addonEditor.vendorPrice ? Number(addonEditor.vendorPrice) : null,
        title: addonEditor.title,
      });

      if (!result.success) {
        setAddonError(result.error ?? "Gagal menyimpan add-on.");
        return;
      }

      setAddonEditor(null);
      router.refresh();
    });
  }

  function removeUnit(id: string) {
    setUnitError("");
    startSaving(async () => {
      const result = await deleteAddonUnit(id);

      if (!result.success) {
        setUnitError(result.error ?? "Gagal menghapus satuan.");
        return;
      }

      if (unitEditor?.id === id) {
        setUnitEditor(null);
      }
      router.refresh();
    });
  }

  function removeAddon(id: string) {
    setAddonError("");
    startSaving(async () => {
      const result = await deleteEventAddon(id);

      if (!result.success) {
        setAddonError(result.error ?? "Gagal menghapus add-on.");
        return;
      }

      if (addonEditor?.id === id) {
        setAddonEditor(null);
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-4">
        <Card className="border-white/80 bg-white/90">
          <CardHeader className="border-b border-border/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Daftar Add-on</CardTitle>
                <CardDescription>Master add-on tenant beserta harga dan satuannya.</CardDescription>
              </div>
              <Button onClick={openCreateAddon} type="button">
                <Plus className="mr-2 size-4" />
                Tambah Add-on
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Harga Vendor</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addons.map((addon) => (
                  <TableRow key={addon.id}>
                    <TableCell className="font-medium text-primary-950">{addon.title}</TableCell>
                    <TableCell className="max-w-[440px] whitespace-normal text-muted-foreground">
                      {addon.description || "-"}
                    </TableCell>
                    <TableCell>{addon.unitName ? formatUnitLabel(addon.unitName) : "-"}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {addon.vendorPrice != null ? formatCurrency(addon.vendorPrice) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary-950 tabular-nums">
                      {formatCurrency(addon.price)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {addon.vendorPrice != null ? (
                        <span className="font-medium text-emerald-700">
                          {formatCurrency(addon.price - addon.vendorPrice)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge active={addon.isActive} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <IconButton
                          icon={<Pencil className="size-4" />}
                          label="Edit"
                          onClick={() => openEditAddon(addon)}
                        />
                        <IconButton
                          destructive
                          icon={<Trash2 className="size-4" />}
                          label="Hapus"
                          onClick={() => removeAddon(addon.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {addons.length === 0 ? (
                  <EmptyRow colSpan={8} label="Belum ada add-on." />
                ) : null}
              </TableBody>
            </Table>

            {addonError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {addonError}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/90">
          <CardHeader className="border-b border-border/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Daftar Satuan</CardTitle>
                <CardDescription>
                  Master satuan dinamis untuk add-on seperti KWH, M2, item, dan lainnya.
                </CardDescription>
              </div>
              <Button onClick={openCreateUnit} type="button" variant="outline">
                <Plus className="mr-2 size-4" />
                Tambah Satuan
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium text-primary-950">
                      {formatUnitLabel(unit.name)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {unit.slug}
                    </TableCell>
                    <TableCell className="max-w-[520px] whitespace-normal text-muted-foreground">
                      {unit.description || "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge active={unit.isActive} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <IconButton
                          icon={<Pencil className="size-4" />}
                          label="Edit"
                          onClick={() => openEditUnit(unit)}
                        />
                        <IconButton
                          destructive
                          icon={<Trash2 className="size-4" />}
                          label="Hapus"
                          onClick={() => removeUnit(unit.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {units.length === 0 ? <EmptyRow colSpan={5} label="Belum ada satuan." /> : null}
              </TableBody>
            </Table>

            {unitError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {unitError}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {addonEditor ? (
        <ModalFrame
          title={addonEditor.id ? "Edit Add-on" : "Tambah Add-on"}
          description="Atur judul, deskripsi, harga, satuan, dan status add-on."
          onClose={() => setAddonEditor(null)}
        >
          <div className="space-y-4">
            <Input
              onChange={(event) =>
                setAddonEditor((current) =>
                  current ? { ...current, title: event.target.value } : current
                )
              }
              placeholder="Judul add-on"
              value={addonEditor.title}
            />
            <textarea
              className="min-h-24 w-full rounded-2xl border border-input bg-white px-3 py-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
              onChange={(event) =>
                setAddonEditor((current) =>
                  current ? { ...current, description: event.target.value } : current
                )
              }
              placeholder="Deskripsi add-on"
              value={addonEditor.description}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Harga Vendor (HPP)</label>
                <Input
                  min={0}
                  onChange={(event) =>
                    setAddonEditor((current) =>
                      current ? { ...current, vendorPrice: event.target.value } : current
                    )
                  }
                  placeholder="Opsional"
                  type="number"
                  value={addonEditor.vendorPrice}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Harga Jual ke Tenant</label>
                <Input
                  min={0}
                  onChange={(event) =>
                    setAddonEditor((current) =>
                      current ? { ...current, price: event.target.value } : current
                    )
                  }
                  placeholder="Harga jual"
                  type="number"
                  value={addonEditor.price}
                />
              </div>
            </div>
            {addonEditor.vendorPrice && addonEditor.price && Number(addonEditor.price) > Number(addonEditor.vendorPrice) && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-sm text-emerald-700">
                Margin FORBIS: <span className="font-semibold">{formatCurrency(Number(addonEditor.price) - Number(addonEditor.vendorPrice))}</span>
                {" "}({Math.round(((Number(addonEditor.price) - Number(addonEditor.vendorPrice)) / Number(addonEditor.vendorPrice)) * 100)}%)
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className="h-11 rounded-2xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                onChange={(event) =>
                  setAddonEditor((current) =>
                    current ? { ...current, addonUnitId: event.target.value } : current
                  )
                }
                value={addonEditor.addonUnitId}
              >
                <option value="">Pilih satuan</option>
                {units
                  .filter((unit) => unit.isActive || unit.id === addonEditor.addonUnitId)
                  .map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {formatUnitLabel(unit.name)}
                    </option>
                  ))}
              </select>
              <select
                className="h-11 rounded-2xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                onChange={(event) =>
                  setAddonEditor((current) =>
                    current ? { ...current, isActive: event.target.value === "active" } : current
                  )
                }
                value={addonEditor.isActive ? "active" : "inactive"}
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>

            {addonError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {addonError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 border-t border-border/70 pt-5">
              <Button onClick={() => setAddonEditor(null)} type="button" variant="outline">
                Batal
              </Button>
              <Button disabled={isSaving} onClick={saveAddon} type="button">
                {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Simpan
              </Button>
            </div>
          </div>
        </ModalFrame>
      ) : null}

      {unitEditor ? (
        <ModalFrame
          title={unitEditor.id ? "Edit Satuan" : "Tambah Satuan"}
          description="Atur nama satuan, deskripsi, dan status aktifnya."
          onClose={() => setUnitEditor(null)}
        >
          <div className="space-y-4">
            <Input
              onChange={(event) =>
                setUnitEditor((current) =>
                  current ? { ...current, name: event.target.value } : current
                )
              }
              placeholder="Contoh: KWH"
              value={unitEditor.name}
            />
            <textarea
              className="min-h-24 w-full rounded-2xl border border-input bg-white px-3 py-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
              onChange={(event) =>
                setUnitEditor((current) =>
                  current ? { ...current, description: event.target.value } : current
                )
              }
              placeholder="Deskripsi satuan"
              value={unitEditor.description}
            />
            <select
              className="h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
              onChange={(event) =>
                setUnitEditor((current) =>
                  current ? { ...current, isActive: event.target.value === "active" } : current
                )
              }
              value={unitEditor.isActive ? "active" : "inactive"}
            >
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>

            {unitError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {unitError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 border-t border-border/70 pt-5">
              <Button onClick={() => setUnitEditor(null)} type="button" variant="outline">
                Batal
              </Button>
              <Button disabled={isSaving} onClick={saveUnit} type="button">
                {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Simpan
              </Button>
            </div>
          </div>
        </ModalFrame>
      ) : null}
    </>
  );
}

function ModalFrame({
  children,
  description,
  onClose,
  title,
}: {
  children: React.ReactNode;
  description: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
              Konfigurasi
            </p>
            <h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-primary-950">
              {title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <button
            className="inline-flex size-10 items-center justify-center rounded-2xl border border-border/80 bg-white text-muted-foreground hover:bg-muted"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      className={
        active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
      }
    >
      {active ? "Aktif" : "Nonaktif"}
    </Badge>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell className="py-8 text-center text-muted-foreground" colSpan={colSpan}>
        {label}
      </TableCell>
    </TableRow>
  );
}

function IconButton({
  destructive,
  icon,
  label,
  onClick,
}: {
  destructive?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex size-9 items-center justify-center rounded-xl border transition ${
        destructive
          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
          : "border-border/70 bg-white text-muted-foreground hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
      }`}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatUnitLabel(value: string) {
  if (value.trim().toLowerCase() === "m2") {
    return "M²";
  }

  return value;
}
