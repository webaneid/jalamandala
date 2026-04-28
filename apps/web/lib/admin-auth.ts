import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@repo/db"
import { userRoles } from "@repo/db/schema/public"

export type AdminRole = "super_admin" | "admin" | "finance" | "event_crew"

const ALL_ADMIN_ROLES: AdminRole[] = ["super_admin", "admin", "finance", "event_crew"]

export type AdminAccess = {
  userId: string
  userName: string
  roles: Set<AdminRole>
  isSuperAdmin: boolean
  can: (role: AdminRole | AdminRole[]) => boolean
}

export async function getAdminSession(): Promise<AdminAccess> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/admin/login")

  const rows = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, session.user.id))

  const roleSet = new Set(rows.map((r) => r.role as AdminRole))
  const hasAnyAdminRole = ALL_ADMIN_ROLES.some((r) => roleSet.has(r))
  if (!hasAnyAdminRole) redirect("/admin/login")

  const isSuperAdmin = roleSet.has("super_admin")

  return {
    userId: session.user.id,
    userName: session.user.name ?? "",
    roles: roleSet,
    isSuperAdmin,
    can: (role) => {
      if (isSuperAdmin) return true
      return Array.isArray(role) ? role.some((r) => roleSet.has(r)) : roleSet.has(role)
    },
  }
}

// Redirects to /admin (dashboard) if none of the allowed roles match.
// super_admin always passes.
export async function requireRoles(allowed: AdminRole[]): Promise<AdminAccess> {
  const access = await getAdminSession()
  if (access.isSuperAdmin) return access
  if (!allowed.some((r) => access.roles.has(r))) redirect("/admin")
  return access
}
