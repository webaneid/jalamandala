import type { Metadata } from "next";
import { getCustomLogosFromBlock, getPaidTenantDirectory } from "@/actions/public-pages";
import { TenantDirectoryClient } from "@/components/public/TenantDirectoryClient";
import { PublicContainer } from "@/components/public/ui/PublicContainer";

export const metadata: Metadata = { title: "Direktori Tenant" };
export const dynamic = "force-dynamic";

export default async function TenantDirectoryPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  const [sponsors, tenants] = await Promise.all([
    getCustomLogosFromBlock(eventSlug),
    getPaidTenantDirectory(),
  ]);

  return (
    <div className="py-10">
      <PublicContainer>
        {/* Header */}
        <div className="mb-8 space-y-2">
          <span className="inline-flex items-center rounded-full bg-[#00adee]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00adee]">
            Expo Tenant
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Direktori Peserta
          </h1>
          <p className="text-sm text-white/50">
            Kenali para peserta dan mitra yang hadir di expo ini.
          </p>
        </div>

        <TenantDirectoryClient sponsors={sponsors} tenants={tenants} />
      </PublicContainer>
    </div>
  );
}
