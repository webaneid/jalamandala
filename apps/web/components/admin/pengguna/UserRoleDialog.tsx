"use client";

import { useState, useTransition } from "react";
import { Shield, X, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addUserRole, removeUserRole } from "@/actions/users";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/user-roles";
import type { UserRole } from "@/lib/user-roles";

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "bg-red-50 text-red-700 border-red-200",
  admin:       "bg-blue-50 text-blue-700 border-blue-200",
  finance:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  event_crew:  "bg-violet-50 text-violet-700 border-violet-200",
  vendor:      "bg-amber-50 text-amber-700 border-amber-200",
  participant: "bg-slate-50 text-slate-600 border-slate-200",
};

interface Role {
  id: string;
  role: UserRole;
}

interface Props {
  userId: string;
  userName: string;
  currentRoles: Role[];
}

export function UserRoleDialog({ userId, userName, currentRoles }: Props) {
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<Role[]>(currentRoles);
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const existingRoleSlugs = new Set(roles.map((r) => r.role));
  const availableRoles = ALL_ROLES.filter((r) => !existingRoleSlugs.has(r));

  function handleAdd() {
    setError("");
    startTransition(async () => {
      const res = await addUserRole({ userId, role: selectedRole });
      if (!res.success) {
        setError(res.error ?? "Gagal menambah role.");
        return;
      }
      // Optimistic update — halaman akan revalidate di background
      setRoles((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: selectedRole },
      ]);
      if (availableRoles.length > 1) {
        const next = availableRoles.find((r) => r !== selectedRole) ?? availableRoles[0]!;
        setSelectedRole(next);
      }
    });
  }

  function handleRemove(roleId: string) {
    setError("");
    startTransition(async () => {
      const res = await removeUserRole(roleId);
      if (!res.success) {
        setError(res.error ?? "Gagal menghapus role.");
        return;
      }
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
    });
  }

  return (
    <>
      <button
        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-white/80 px-3 text-xs font-medium text-foreground hover:bg-white transition"
        onClick={() => { setRoles(currentRoles); setError(""); setOpen(true); }}
        type="button"
      >
        <Shield className="size-3.5" />
        Kelola Role
      </button>

      <Dialog open={open} onClose={() => !isPending && setOpen(false)}>
        <DialogHeader>
          <div>
            <DialogTitle>Kelola Role</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{userName}</p>
          </div>
          <DialogClose onClose={() => !isPending && setOpen(false)} />
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Role badges yang sudah ada */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Role aktif</p>
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada role.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => (
                  <span
                    key={r.id}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${ROLE_COLORS[r.role]}`}
                  >
                    {ROLE_LABELS[r.role]}
                    <button
                      className="ml-0.5 rounded-full hover:opacity-60 transition disabled:opacity-30"
                      disabled={isPending}
                      onClick={() => handleRemove(r.id)}
                      type="button"
                      title="Hapus role ini"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tambah role baru */}
          {availableRoles.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tambah role</p>
              <div className="flex gap-2">
                <select
                  className="flex-1 h-9 rounded-xl border border-border/80 bg-white px-3 text-sm outline-none focus:border-primary/40"
                  disabled={isPending}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  value={selectedRole}
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <Button
                  className="h-9 rounded-xl gap-1.5"
                  disabled={isPending}
                  onClick={handleAdd}
                  type="button"
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  Tambah
                </Button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-2xl"
            disabled={isPending}
            onClick={() => setOpen(false)}
            type="button"
          >
            Selesai
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
