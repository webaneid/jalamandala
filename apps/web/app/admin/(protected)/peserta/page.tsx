import { requireRoles } from "@/lib/admin-auth";
import Link from "next/link";
import { FileDown, UserPlus, SlidersHorizontal, Search, CheckCircle2 } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PesertaTable } from "@/components/admin/peserta/PesertaTable";
import { getParticipantsWithBookings } from "@/actions/participants";


export const metadata = {
  title: "Peserta",
};

export default async function PesertaPage() {
  const adminAccess = await requireRoles(["admin", "finance"]);
  const canExport = adminAccess.isSuperAdmin || adminAccess.can("finance");
  const participants = await getParticipantsWithBookings();

  const confirmedCount = participants.filter((p) => ["paid", "dp_paid"].includes(p.bookingStatus)).length;
  const waitingCount = participants.filter((p) => p.bookingStatus === "waiting").length;
  const noBookingCount = participants.filter((p) => p.bookingStatus === "none").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Data Pendaftar"
        title="Peserta Expo"
        description="Kelola data peserta, lakukan verifikasi, dan tambah peserta manual bila diperlukan."
        actions={
          <>
            <Link href="/admin/peserta/tambah" className={buttonVariants({ className: "rounded-2xl px-4" })}>
              <UserPlus className="size-4" />
              Tambah Peserta
            </Link>
            {canExport && (
              <a
                href="/api/admin/export/peserta"
                download
                className={buttonVariants({ variant: "outline", className: "rounded-2xl bg-white/90 px-4" })}
              >
                <FileDown className="size-4" />
                Export Laporan
              </a>
            )}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard
          label="Total Pendaftar"
          value={participants.length.toString()}
          detail="Semua peserta yang sudah masuk sistem."
          icon={UserPlus}
          trend="up"
          trendLabel="Total"
        />
        <AdminMetricCard
          label="Tenant Konfirmasi"
          value={confirmedCount.toString()}
          detail="Sudah bayar DP atau lunas — dipastikan ikut."
          icon={CheckCircle2}
          trend="up"
          trendLabel="DP / Lunas"
        />
        <AdminMetricCard
          label="Menunggu Bayar"
          value={waitingCount.toString()}
          detail="Sudah booking, invoice terbit, belum bayar."
          icon={SlidersHorizontal}
          trend={waitingCount > 0 ? "down" : "neutral"}
          trendLabel="Pending"
        />
        <AdminMetricCard
          label="Belum Booking"
          value={noBookingCount.toString()}
          detail="Daftar tapi belum ambil booth."
          icon={Search}
          trend="neutral"
          trendLabel="Registrasi saja"
        />
      </div>

      <Card className="border-white/80 bg-white/90 shadow-sm ring-1 ring-black/5 rounded-[32px] overflow-hidden">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle>Daftar Peserta</CardTitle>
          <CardDescription>Filter berdasarkan status booking.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <PesertaTable initialData={participants} />
        </CardContent>
      </Card>
    </div>
  );
}
