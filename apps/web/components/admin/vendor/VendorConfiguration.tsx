"use client";

import * as React from "react";
import { KeyRound, Loader2, Pencil, Plus, Power, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { createVendor, toggleVendorActive, updateVendor, resetVendorPassword } from "@/actions/vendors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type ZoneOption = { id: string; slug: string; name: string };
type AddonOption = { id: string; name: string };

type VendorItem = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  vendorType: "booth" | "addon";
  isActive: boolean;
  notes: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankAccountName: string | null;
  boothAssignments: { id: string; zoneSlug: string }[];
  addonAssignments: { id: string; eventAddonId: string }[];
};

type CreateForm = {
  name: string; email: string; password: string; whatsapp: string;
  vendorType: "booth" | "addon"; notes: string;
  selectedZones: string[]; selectedAddons: string[];
} | null;

type EditForm = {
  id: string; name: string; whatsapp: string; notes: string;
  vendorType: "booth" | "addon";
  selectedZones: string[]; selectedAddons: string[];
  bankName: string; bankAccount: string; bankAccountName: string;
} | null;

type PasswordForm = { id: string; name: string; password: string } | null;

function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function VendorConfiguration({
  vendors, eventId, zoneOptions, addonOptions,
}: {
  vendors: VendorItem[];
  eventId: string;
  zoneOptions: ZoneOption[];
  addonOptions: AddonOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [createForm, setCreateForm] = React.useState<CreateForm>(null);
  const [editForm, setEditForm] = React.useState<EditForm>(null);
  const [passwordForm, setPasswordForm] = React.useState<PasswordForm>(null);
  const [error, setError] = React.useState("");

  function openCreate() {
    setError("");
    setCreateForm({ name: "", email: "", password: generatePassword(), whatsapp: "", vendorType: "booth", notes: "", selectedZones: [], selectedAddons: [] });
  }

  function openEdit(v: VendorItem) {
    setError("");
    setEditForm({
      id: v.id, name: v.name, whatsapp: v.whatsapp, notes: v.notes ?? "",
      vendorType: v.vendorType,
      selectedZones: v.boothAssignments.map((a) => a.zoneSlug),
      selectedAddons: v.addonAssignments.map((a) => a.eventAddonId),
      bankName: v.bankName ?? "",
      bankAccount: v.bankAccount ?? "",
      bankAccountName: v.bankAccountName ?? "",
    });
  }

  function openPassword(v: VendorItem) {
    setError("");
    setPasswordForm({ id: v.id, name: v.name, password: generatePassword() });
  }

  // --- create ---
  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm) return;
    setError("");
    if (!createForm.name.trim()) { setError("Nama wajib diisi."); return; }
    if (!createForm.email.trim()) { setError("Email wajib diisi."); return; }
    if (!createForm.whatsapp.trim()) { setError("WhatsApp wajib diisi."); return; }
    startTransition(async () => {
      const result = await createVendor({
        name: createForm.name, email: createForm.email, password: createForm.password,
        whatsapp: createForm.whatsapp, vendorType: createForm.vendorType, eventId,
        notes: createForm.notes,
        zoneSlugs: createForm.vendorType === "booth" ? createForm.selectedZones : undefined,
        addonIds: createForm.vendorType === "addon" ? createForm.selectedAddons : undefined,
      });
      if (!result.success) { setError(result.error ?? "Gagal membuat vendor."); return; }
      setCreateForm(null);
      router.refresh();
    });
  }

  // --- edit ---
  function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm) return;
    setError("");
    if (!editForm.name.trim()) { setError("Nama wajib diisi."); return; }
    if (!editForm.whatsapp.trim()) { setError("WhatsApp wajib diisi."); return; }
    startTransition(async () => {
      const result = await updateVendor(editForm.id, {
        name: editForm.name, whatsapp: editForm.whatsapp, notes: editForm.notes,
        zoneSlugs: editForm.vendorType === "booth" ? editForm.selectedZones : undefined,
        addonIds: editForm.vendorType === "addon" ? editForm.selectedAddons : undefined,
        bankName: editForm.bankName,
        bankAccount: editForm.bankAccount,
        bankAccountName: editForm.bankAccountName,
      });
      if (!result.success) { setError(result.error ?? "Gagal menyimpan."); return; }
      setEditForm(null);
      router.refresh();
    });
  }

  // --- password ---
  function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordForm) return;
    setError("");
    if (passwordForm.password.length < 8) { setError("Password minimal 8 karakter."); return; }
    startTransition(async () => {
      const result = await resetVendorPassword(passwordForm.id, passwordForm.password);
      if (!result.success) { setError(result.error ?? "Gagal mengubah password."); return; }
      setPasswordForm(null);
    });
  }

  function handleToggle(vendorId: string, current: boolean) {
    startTransition(async () => {
      await toggleVendorActive(vendorId, !current);
      router.refresh();
    });
  }

  // shared zone/addon togglers
  function toggleZoneIn<T extends { selectedZones: string[] }>(
    state: T, setFn: React.Dispatch<React.SetStateAction<T | null>>, slug: string
  ) {
    const next = state.selectedZones.includes(slug)
      ? state.selectedZones.filter((s) => s !== slug)
      : [...state.selectedZones, slug];
    setFn({ ...state, selectedZones: next });
  }

  function toggleAddonIn<T extends { selectedAddons: string[] }>(
    state: T, setFn: React.Dispatch<React.SetStateAction<T | null>>, id: string
  ) {
    const next = state.selectedAddons.includes(id)
      ? state.selectedAddons.filter((s) => s !== id)
      : [...state.selectedAddons, id];
    setFn({ ...state, selectedAddons: next });
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-none bg-white/72 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <div>
            <CardTitle className="text-base">Daftar Vendor</CardTitle>
            <CardDescription>Vendor aktif untuk event ini.</CardDescription>
          </div>
          <Button onClick={openCreate} size="sm" className="rounded-xl">
            <Plus className="mr-1.5 size-4" />
            Tambah Vendor
          </Button>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <p className="text-sm">Belum ada vendor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Penugasan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell className="text-muted-foreground">{v.email}</TableCell>
                      <TableCell className="text-muted-foreground">{v.whatsapp}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={v.vendorType === "booth" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                          {v.vendorType === "booth" ? "Booth" : "Add-on"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.vendorType === "booth"
                          ? v.boothAssignments.length > 0
                            ? v.boothAssignments.map((a) => zoneOptions.find((z) => z.slug === a.zoneSlug)?.name ?? a.zoneSlug).join(", ")
                            : "-"
                          : v.addonAssignments.length > 0
                            ? v.addonAssignments.map((a) => addonOptions.find((o) => o.id === a.eventAddonId)?.name ?? "-").join(", ")
                            : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={v.isActive ? "border-green-200 bg-green-50 text-green-700" : "border-neutral-200 bg-neutral-50 text-neutral-500"}>
                          {v.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(v)} disabled={isPending} className="inline-flex size-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:bg-neutral-50 disabled:opacity-50" title="Edit" type="button">
                            <Pencil className="size-3.5" />
                          </button>
                          <button onClick={() => openPassword(v)} disabled={isPending} className="inline-flex size-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:bg-neutral-50 disabled:opacity-50" title="Reset Password" type="button">
                            <KeyRound className="size-3.5" />
                          </button>
                          <button onClick={() => handleToggle(v.id, v.isActive)} disabled={isPending} className="inline-flex size-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:bg-neutral-50 disabled:opacity-50" title={v.isActive ? "Nonaktifkan" : "Aktifkan"} type="button">
                            <Power className="size-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Tambah */}
      {createForm && (
        <Modal title="Tambah Vendor" subtitle="Akun vendor baru" onClose={() => setCreateForm(null)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nama *">
                <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Nama vendor" className="h-10 rounded-xl" />
              </Field>
              <Field label="WhatsApp *">
                <Input value={createForm.whatsapp} onChange={(e) => setCreateForm({ ...createForm, whatsapp: e.target.value })} placeholder="628xxx" className="h-10 rounded-xl" />
              </Field>
            </div>
            <Field label="Email login *">
              <Input value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} type="email" placeholder="email@vendor.com" className="h-10 rounded-xl" />
            </Field>
            <Field label="Password sementara">
              <div className="flex gap-2">
                <Input value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="h-10 rounded-xl font-mono text-sm" />
                <button type="button" onClick={() => setCreateForm({ ...createForm, password: generatePassword() })} className="rounded-xl border border-neutral-200 px-3 text-xs text-neutral-600 hover:bg-neutral-50">Acak</button>
              </div>
            </Field>
            <Field label="Tipe vendor">
              <div className="flex gap-2">
                <TypeBtn active={createForm.vendorType === "booth"} color="blue" onClick={() => setCreateForm({ ...createForm, vendorType: "booth", selectedZones: [], selectedAddons: [] })}>Booth</TypeBtn>
                <TypeBtn active={createForm.vendorType === "addon"} color="amber" onClick={() => setCreateForm({ ...createForm, vendorType: "addon", selectedZones: [], selectedAddons: [] })}>Add-on</TypeBtn>
              </div>
            </Field>
            {createForm.vendorType === "booth" && (
              <Field label="Zona yang ditugaskan">
                <AssignmentChips items={zoneOptions.map((z) => ({ id: z.slug, label: z.name }))} selected={createForm.selectedZones} color="blue" onToggle={(slug) => toggleZoneIn(createForm, setCreateForm, slug)} />
              </Field>
            )}
            {createForm.vendorType === "addon" && (
              <Field label="Add-on yang ditugaskan">
                <AssignmentChips items={addonOptions.map((a) => ({ id: a.id, label: a.name }))} selected={createForm.selectedAddons} color="amber" onToggle={(id) => toggleAddonIn(createForm, setCreateForm, id)} />
              </Field>
            )}
            <Field label="Catatan (opsional)">
              <Input value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} placeholder="Catatan internal" className="h-10 rounded-xl" />
            </Field>
            <ModalFooter error={error} isPending={isPending} onCancel={() => setCreateForm(null)} />
          </form>
        </Modal>
      )}

      {/* Modal Edit */}
      {editForm && (
        <Modal title="Edit Vendor" subtitle={editForm.name} onClose={() => setEditForm(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nama *">
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-10 rounded-xl" />
              </Field>
              <Field label="WhatsApp *">
                <Input value={editForm.whatsapp} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} className="h-10 rounded-xl" />
              </Field>
            </div>
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Rekening Bank (untuk Pencairan Dana)</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nama Bank">
                  <Input value={editForm.bankName} onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })} placeholder="BCA, Mandiri, dll" className="h-10 rounded-xl bg-white" />
                </Field>
                <Field label="Nomor Rekening">
                  <Input value={editForm.bankAccount} onChange={(e) => setEditForm({ ...editForm, bankAccount: e.target.value })} placeholder="12345678" className="h-10 rounded-xl bg-white" />
                </Field>
              </div>
              <Field label="Nama Pemilik Rekening">
                <Input value={editForm.bankAccountName} onChange={(e) => setEditForm({ ...editForm, bankAccountName: e.target.value })} placeholder="Nama lengkap sesuai rekening" className="h-10 rounded-xl bg-white" />
              </Field>
            </div>
            {editForm.vendorType === "booth" && (
              <Field label="Zona yang ditugaskan">
                <AssignmentChips items={zoneOptions.map((z) => ({ id: z.slug, label: z.name }))} selected={editForm.selectedZones} color="blue" onToggle={(slug) => toggleZoneIn(editForm, setEditForm, slug)} />
              </Field>
            )}
            {editForm.vendorType === "addon" && (
              <Field label="Add-on yang ditugaskan">
                <AssignmentChips items={addonOptions.map((a) => ({ id: a.id, label: a.name }))} selected={editForm.selectedAddons} color="amber" onToggle={(id) => toggleAddonIn(editForm, setEditForm, id)} />
              </Field>
            )}
            <Field label="Catatan (opsional)">
              <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Catatan internal" className="h-10 rounded-xl" />
            </Field>
            <ModalFooter error={error} isPending={isPending} onCancel={() => setEditForm(null)} />
          </form>
        </Modal>
      )}

      {/* Modal Reset Password */}
      {passwordForm && (
        <Modal title="Reset Password" subtitle={passwordForm.name} onClose={() => setPasswordForm(null)}>
          <form onSubmit={handlePassword} className="space-y-4">
            <Field label="Password baru">
              <div className="flex gap-2">
                <Input value={passwordForm.password} onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })} className="h-10 rounded-xl font-mono text-sm" />
                <button type="button" onClick={() => setPasswordForm({ ...passwordForm, password: generatePassword() })} className="rounded-xl border border-neutral-200 px-3 text-xs text-neutral-600 hover:bg-neutral-50">Acak</button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Minimal 8 karakter. Salin dan kirim ke vendor sebelum menutup dialog ini.</p>
            </Field>
            <ModalFooter error={error} isPending={isPending} onCancel={() => setPasswordForm(null)} submitLabel="Simpan Password" />
          </form>
        </Modal>
      )}
    </div>
  );
}

// --- sub-components ---

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/80 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">{title}</p>
            <h3 className="mt-1 text-lg font-semibold text-neutral-900">{subtitle}</h3>
          </div>
          <button onClick={onClose} className="inline-flex size-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-400 hover:bg-neutral-50" type="button">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-neutral-800">{label}</label>
      {children}
    </div>
  );
}

function TypeBtn({ active, color, onClick, children }: { active: boolean; color: "blue" | "amber"; onClick: () => void; children: React.ReactNode }) {
  const on = color === "blue" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-amber-300 bg-amber-50 text-amber-700";
  return (
    <button type="button" onClick={onClick} className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${active ? on : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
      {children}
    </button>
  );
}

function AssignmentChips({ items, selected, color, onToggle }: { items: { id: string; label: string }[]; selected: string[]; color: "blue" | "amber"; onToggle: (id: string) => void }) {
  const on = color === "blue" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-amber-300 bg-amber-50 text-amber-700";
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onToggle(item.id)} className={`rounded-xl border px-3 py-1.5 text-sm transition ${selected.includes(item.id) ? on : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ModalFooter({ error, isPending, onCancel, submitLabel = "Simpan" }: { error: string; isPending: boolean; onCancel: () => void; submitLabel?: string }) {
  return (
    <>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex justify-end gap-3 border-t pt-4">
        <button type="button" onClick={onCancel} disabled={isPending} className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Batal</button>
        <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </>
  );
}
