import type { Metadata } from "next";
import { ReactNode } from "react"

import { AdminShell } from "@/components/admin/admin-shell"

export const metadata: Metadata = {
  title: {
    template: "%s — Admin Jalamandala",
    default: "Admin Jalamandala",
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
