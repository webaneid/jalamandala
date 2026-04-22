"use client";

import { useEffect, useState, useTransition } from "react";
import { UserPlus, Loader2, Eye, EyeOff, Search, Check } from "lucide-react";
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
import { createUser } from "@/actions/users";
import type { ForbisMemberOption } from "@/lib/forbis-members";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/user-roles";
import type { UserRole } from "@/lib/user-roles";

export function TambahUserDialog() {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [memberQuery, setMemberQuery] = useState("");
  const [memberOptions, setMemberOptions] = useState<ForbisMemberOption[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin" as UserRole,
  });

  function reset() {
    setForm({ name: "", email: "", password: "", role: "admin" });
    setError("");
    setShowPassword(false);
    setMemberQuery("");
    setMemberOptions([]);
    setMemberSearchOpen(false);
    setSelectedMemberId(null);
  }

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setMemberLoading(true);

      try {
        const params = new URLSearchParams();
        if (memberQuery.trim()) {
          params.set("q", memberQuery.trim());
        }

        const response = await fetch(`/api/forbis-members?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          setMemberOptions([]);
          return;
        }

        const payload = (await response.json()) as { members?: ForbisMemberOption[] };
        setMemberOptions(payload.members ?? []);
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setMemberOptions([]);
        }
      } finally {
        setMemberLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [memberQuery, open]);

  function handleClose() {
    if (isPending) return;
    reset();
    setOpen(false);
  }

  function handleSelectMember(member: ForbisMemberOption) {
    setSelectedMemberId(member.id);
    setMemberQuery(member.name);
    setMemberSearchOpen(false);
    setForm((current) => ({
      ...current,
      email: member.email?.trim() || current.email,
      name: member.name,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    startTransition(async () => {
      const res = await createUser(form);
      if (!res.success) {
        setError(res.error ?? "Gagal membuat user.");
        return;
      }
      handleClose();
    });
  }

  return (
    <>
      <Button className="h-10 rounded-2xl gap-2" onClick={() => setOpen(true)} type="button">
        <UserPlus className="size-4" />
        Tambah User
      </Button>

      <Dialog open={open} onClose={handleClose}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div>
              <DialogTitle>Tambah User Baru</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">User tidak bisa mendaftar sendiri</p>
            </div>
            <DialogClose onClose={handleClose} />
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tu-member-search">Cari dari Anggota FORBIS</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="tu-member-search"
                  placeholder="Cari nama anggota FORBIS"
                  disabled={isPending}
                  value={memberQuery}
                  className="h-11 rounded-2xl pl-9 pr-9"
                  onBlur={() => {
                    window.setTimeout(() => setMemberSearchOpen(false), 140);
                  }}
                  onChange={(e) => {
                    setSelectedMemberId(null);
                    setMemberQuery(e.target.value);
                    setMemberSearchOpen(true);
                  }}
                  onFocus={() => setMemberSearchOpen(true)}
                />
                {selectedMemberId ? (
                  <Check className="pointer-events-none absolute top-1/2 right-3 z-10 size-4 -translate-y-1/2 text-emerald-500" />
                ) : null}

                {memberSearchOpen ? (
                  <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border/80 bg-white/98 shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                    {memberOptions.length > 0 ? (
                      <div className="max-h-72 overflow-y-auto p-2">
                        {memberOptions.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted/60"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleSelectMember(member);
                            }}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{member.name}</span>
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {[member.forbisMemberId, member.email, member.companyName]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        {memberLoading
                          ? "Memuat..."
                          : memberQuery.trim()
                            ? "Tidak ada anggota yang cocok. Lanjut isi nama secara manual."
                            : "Ketik nama untuk mencari anggota FORBIS."}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Pilih anggota FORBIS untuk mengisi otomatis nama dan email. Kalau tidak ada, isi manual saja.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tu-name">Nama Lengkap</Label>
              <Input
                id="tu-name"
                placeholder="Ahmad Fulan"
                required
                disabled={isPending}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tu-email">Email</Label>
              <Input
                id="tu-email"
                type="email"
                placeholder="user@example.com"
                required
                disabled={isPending}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tu-password">Password</Label>
              <div className="relative">
                <Input
                  id="tu-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 karakter"
                  required
                  disabled={isPending}
                  value={form.password}
                  className="pr-10"
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  type="button"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tu-role">Role Awal</Label>
              <select
                id="tu-role"
                className="h-10 w-full rounded-2xl border border-border/80 bg-white px-3 text-sm outline-none focus:border-primary/40"
                disabled={isPending}
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" disabled={isPending} onClick={handleClose} type="button">
              Batal
            </Button>
            <Button className="rounded-2xl gap-2" disabled={isPending} type="submit">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Buat User
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
