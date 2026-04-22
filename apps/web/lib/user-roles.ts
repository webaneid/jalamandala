export type UserRole = "super_admin" | "admin" | "finance" | "event_crew" | "vendor" | "participant";

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin:       "Admin",
  finance:     "Keuangan",
  event_crew:  "Seksi Acara",
  vendor:      "Vendor",
  participant: "Peserta",
};

export const ALL_ROLES = Object.keys(ROLE_LABELS) as UserRole[];
