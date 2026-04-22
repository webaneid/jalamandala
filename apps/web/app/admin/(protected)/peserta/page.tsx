import Link from "next/link";
import { FileDown, UserPlus, SlidersHorizontal, Search } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PesertaTable } from "@/components/admin/peserta/PesertaTable";
import { getParticipants } from "@/actions/participants";

export default async function PesertaPage() {
  const participants = await getParticipants();
  const needBusinessCount = participants.filter(
    (participant) =>
      participant.businesses.length === 0 ||
      !participant.businesses.some((business) => !!business.logoAssetId)
  ).length;
  const validCount = participants.filter(
    (participant) =>
      participant.businesses.length > 0 &&
      participant.businesses.some((business) => !!business.logoAssetId)
  ).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Data Pendaftar"
        title="Verifikasi peserta expo"
        description="Kelola data peserta, lakukan verifikasi, dan tambah peserta manual bila diperlukan."
        actions={
          <>
            <Link
              href="/admin/peserta/tambah"
              className={buttonVariants({ className: "rounded-2xl px-4" })}
            >
              <UserPlus className="size-4" />
              Tambah Peserta
            </Link>
            <Button variant="outline" className="rounded-2xl bg-white/90 px-4">
              <FileDown className="size-4" />
              Export Data
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          label="Total Pendaftar"
          value={participants.length.toString()}
          detail="Jumlah total peserta yang sudah masuk ke dalam sistem."
          icon={UserPlus}
          trend="up"
          trendLabel="Aktif"
        />
        <AdminMetricCard
          label="Butuh Verifikasi"
          value={needBusinessCount.toString()}
          detail="Peserta yang identitasnya sudah ada, tetapi data usaha belum lengkap."
          icon={SlidersHorizontal}
          trend={needBusinessCount > 0 ? "down" : "neutral"}
          trendLabel="Antrian"
        />
        <AdminMetricCard
          label="Sudah Valid"
          value={validCount.toString()}
          detail="Peserta dengan data usaha aktif dan logo yang sudah tersimpan."
          icon={Search}
          trend="up"
          trendLabel={`${participants.length > 0 ? Math.round((validCount / participants.length) * 100) : 0}% tervalidasi`}
        />
      </div>

      <Card className="border-white/80 bg-white/90 shadow-sm ring-1 ring-black/5 rounded-[32px] overflow-hidden">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle>Data Peserta Pendaftar</CardTitle>
          <CardDescription>Daftar peserta yang diambil langsung dari database.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <PesertaTable initialData={participants} />
        </CardContent>
      </Card>
    </div>
  );
}
