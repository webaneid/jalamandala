import { MessageCircle } from "lucide-react";

import { requireRoles } from "@/lib/admin-auth";
import { getWaRotatorAgents } from "@/actions/wa-rotator";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { WaRotatorDashboard } from "@/components/admin/wa-rotator/WaRotatorDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "WhatsApp Rotator",
};

export default async function WaRotatorPage() {
  const access = await requireRoles(["finance", "admin"]);
  const agents = await getWaRotatorAgents();
  const isSuperAdmin = access.roles.has("super_admin");

  return (
    <div className="space-y-6 pb-12">
      <AdminPageHeader
        eyebrow="Customer Service"
        title="WhatsApp Rotator"
        description="Distribusi chat CS ke tim secara bergiliran dan presisi."
      />
      <WaRotatorDashboard initialAgents={agents} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
