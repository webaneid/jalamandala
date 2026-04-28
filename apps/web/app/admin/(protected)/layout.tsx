import type { Metadata } from "next";
import { ReactNode } from "react"

import { getAdminSession } from "@/lib/admin-auth"
import { AdminShell } from "@/components/admin/admin-shell"

export const metadata: Metadata = {
  title: {
    template: "%s — Admin Jalamandala",
    default: "Admin Jalamandala",
  },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await getAdminSession()
  const userRoles = Array.from(access.roles)
  return <AdminShell userRoles={userRoles}>{children}</AdminShell>
}
