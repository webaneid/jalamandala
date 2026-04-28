import { requireRoles } from "@/lib/admin-auth";
import { UserCheck } from "lucide-react";

import { getUsers } from "@/actions/users";
import { ROLE_LABELS } from "@/lib/user-roles";
import type { UserRole } from "@/lib/user-roles";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { UserRoleDialog } from "@/components/admin/pengguna/UserRoleDialog";
import { TambahUserDialog } from "@/components/admin/pengguna/TambahUserDialog";

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "bg-red-50 text-red-700 border-red-200",
  admin:       "bg-blue-50 text-blue-700 border-blue-200",
  finance:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  event_crew:  "bg-violet-50 text-violet-700 border-violet-200",
  vendor:      "bg-amber-50 text-amber-700 border-amber-200",
  participant: "bg-slate-50 text-slate-600 border-slate-200",
};


export const metadata = {
  title: "Pengguna",
};

export default async function PenggunaPage() {
  await requireRoles([]);
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <AdminPageHeader
          eyebrow="Manajemen Akses"
          title="Pengguna & Role"
          description="Kelola akun pengguna dan hak akses mereka ke sistem."
        />
        <TambahUserDialog />
      </div>

      <Card className="rounded-[28px] border-none bg-white/72 shadow-none">
        <CardContent className="p-5 sm:p-6">
          {users.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <UserCheck className="size-10 opacity-30" />
              <p className="text-sm">Belum ada pengguna.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 pr-4">Nama</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Bergabung</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {users.map((u) => (
                    <tr key={u.id} className="group">
                      <td className="py-3 pr-4 font-medium">{u.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                      <td className="py-3 pr-4">
                        {u.roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground opacity-50">Tidak ada role</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {u.roles.map((r) => (
                              <span
                                key={r.id}
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[r.role as UserRole]}`}
                              >
                                {ROLE_LABELS[r.role as UserRole]}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {u.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3">
                        <UserRoleDialog
                          userId={u.id}
                          userName={u.name}
                          currentRoles={u.roles.map((r) => ({ id: r.id, role: r.role as UserRole }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
