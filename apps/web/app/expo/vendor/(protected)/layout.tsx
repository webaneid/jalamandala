import type { Metadata } from "next";
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import type { ReactNode } from 'react';

import { auth } from '@/lib/auth';
import { db } from '@repo/db';
import { userRoles, vendors } from '@repo/db/schema/public';
import { VendorShell } from '@/components/vendor/VendorShell';

export const metadata: Metadata = {
  title: {
    template: "%s — Vendor Portal",
    default: "Vendor Portal",
  },
};

export default async function VendorProtectedLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect('/vendor/login');
  }

  const role = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, session.user.id))
    .limit(1);

  if (!role.some((r) => r.role === 'vendor')) {
    redirect('/vendor/login');
  }

  const vendor = await db.query.vendors.findFirst({
    where: eq(vendors.userId, session.user.id),
    with: {
      boothAssignments: true,
      addonAssignments: true,
    },
  });

  if (!vendor || !vendor.isActive) {
    redirect('/vendor/login');
  }

  return (
    <VendorShell
      vendorName={vendor.name}
      vendorType={vendor.vendorType}
      userName={session.user.name}
    >
      {children}
    </VendorShell>
  );
}
