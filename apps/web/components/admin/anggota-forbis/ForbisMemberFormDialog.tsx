"use client";

import { useState, useTransition } from "react";
import { UserPlus, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createForbisMember, updateForbisMember } from "@/actions/forbis-members";
import type { ForbisMemberPayload } from "@/actions/forbis-members";

interface Member {
  id: string;
  name: string;
  forbisMemberId?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  isKmiAlumni?: boolean | null;
  kmiYear?: string | null;
  companyName?: string | null;
  boothName?: string | null;
  brandName?: string | null;
}

interface Props {
  member?: Member;
}

const EMPTY: ForbisMemberPayload = {
  name: "",
  forbisMemberId: "",
  email: "",
  phone: "",
  whatsapp: "",
  isKmiAlumni: false,
  kmiYear: "",
  companyName: "",
  boothName: "",
  brandName: "",
};

function memberToForm(m: Member): ForbisMemberPayload {
  return {
    name: m.name,
    forbisMemberId: m.forbisMemberId ?? "",
    email: m.email ?? "",
    phone: m.phone ?? "",
    whatsapp: m.whatsapp ?? "",
    isKmiAlumni: m.isKmiAlumni ?? false,
    kmiYear: m.kmiYear ?? "",
    companyName: m.companyName ?? "",
    boothName: m.boothName ?? "",
    brandName: m.brandName ?? "",
  };
}

export function ForbisMemberFormDialog({ member }: Props) {
  const isEdit = !!member;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ForbisMemberPayload>(EMPTY);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setForm(isEdit ? memberToForm(member) : EMPTY);
    setError("");
    setOpen(true);
  }

  function handleClose() {
    if (isPending) return;
    setOpen(false);
  }

  function set(key: keyof ForbisMemberPayload, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Nama wajib diisi."); return; }
    setError("");

    startTransition(async () => {
      const res = isEdit
        ? await updateForbisMember(member.id, form)
        : await createForbisMember(form);

      if (!res.success) { setError(res.error ?? "Gagal menyimpan."); return; }
      setOpen(false);
    });
  }

  return (
    <>
      {isEdit ? (
        <button
          className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
          onClick={handleOpen}
          title="Edit"
          type="button"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <Button className="h-10 rounded-2xl gap-2" onClick={handleOpen} type="button">
          <UserPlus className="size-4" />
          Tambah
        </Button>
      )}

      <Dialog open={open} onClose={handleClose}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div>
              <DialogTitle>{isEdit ? "Edit Anggota" : "Tambah Anggota FORBIS"}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEdit ? member.name : "Data baru akan tersedia di autocomplete pendaftaran"}
              </p>
            </div>
            <DialogClose onClose={handleClose} />
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Nama */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fm-name">Nama Lengkap *</Label>
                <Input id="fm-name" required disabled={isPending} value={form.name}
                  onChange={(e) => set("name", e.target.value)} placeholder="Ahmad Fulan" />
              </div>

              {/* ID FORBIS */}
              <div className="space-y-1.5">
                <Label htmlFor="fm-fid">ID FORBIS</Label>
                <Input id="fm-fid" disabled={isPending} value={form.forbisMemberId}
                  onChange={(e) => set("forbisMemberId", e.target.value)} placeholder="2016*****" />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="fm-email">Email</Label>
                <Input id="fm-email" type="email" disabled={isPending} value={form.email}
                  onChange={(e) => set("email", e.target.value)} placeholder="contoh@email.com" />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="fm-phone">Telepon</Label>
                <Input id="fm-phone" disabled={isPending} value={form.phone}
                  onChange={(e) => set("phone", e.target.value)} placeholder="081234567890" />
              </div>

              {/* WhatsApp */}
              <div className="space-y-1.5">
                <Label htmlFor="fm-wa">WhatsApp</Label>
                <Input id="fm-wa" disabled={isPending} value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)} placeholder="081234567890" />
              </div>

              {/* KMI Alumni */}
              <div className="space-y-1.5">
                <Label htmlFor="fm-kmi">Alumni KMI / Gontor</Label>
                <select
                  id="fm-kmi"
                  className="h-10 w-full rounded-2xl border border-border/80 bg-white px-3 text-sm outline-none focus:border-primary/40"
                  disabled={isPending}
                  value={form.isKmiAlumni ? "ya" : "bukan"}
                  onChange={(e) => set("isKmiAlumni", e.target.value === "ya")}
                >
                  <option value="bukan">Bukan Alumni</option>
                  <option value="ya">Alumni KMI</option>
                </select>
              </div>

              {/* KMI Year */}
              {form.isKmiAlumni && (
                <div className="space-y-1.5">
                  <Label htmlFor="fm-kmiyear">Tahun Lulus KMI</Label>
                  <Input id="fm-kmiyear" type="number" disabled={isPending} value={form.kmiYear}
                    onChange={(e) => set("kmiYear", e.target.value)} placeholder="2010" />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data Usaha</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fm-company">Nama Perusahaan</Label>
                  <Input id="fm-company" disabled={isPending} value={form.companyName}
                    onChange={(e) => set("companyName", e.target.value)} placeholder="PT Contoh Usaha" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fm-brand">Nama Brand</Label>
                  <Input id="fm-brand" disabled={isPending} value={form.brandName}
                    onChange={(e) => set("brandName", e.target.value)} placeholder="Nama brand / produk" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fm-booth">Nama Booth</Label>
                  <Input id="fm-booth" disabled={isPending} value={form.boothName}
                    onChange={(e) => set("boothName", e.target.value)} placeholder="Nama booth di expo" />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" disabled={isPending} onClick={handleClose} type="button">
              Batal
            </Button>
            <Button className="rounded-2xl gap-2" disabled={isPending} type="submit">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : isEdit ? <Pencil className="size-4" /> : <UserPlus className="size-4" />}
              {isEdit ? "Simpan Perubahan" : "Tambah Anggota"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
