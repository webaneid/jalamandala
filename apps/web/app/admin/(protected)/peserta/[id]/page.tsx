import Link from "next/link";
import { ArrowLeft, Pencil, Building2, UserCircle2, Phone, MessageSquare, GraduationCap, CheckCircle2, AlertCircle } from "lucide-react";
import { PrivateImage } from "@/components/admin/media/PrivateImage";

import { db } from "@repo/db";
import { forbisMembers, participants } from "@repo/db/schema/public";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AddBusinessButton } from "@/components/admin/peserta/AddBusinessButton";
import { BusinessItemActions } from "@/components/admin/peserta/BusinessItemActions";
import { getBoothFormOptions } from "@/lib/booth-form-options";


export const metadata = {
  title: "Detail Peserta",
};

export default async function ParticipantViewPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, id),
    with: {
      businesses: true,
    },
  });

  if (!participant) {
    notFound();
  }

  const { boothCategories } = await getBoothFormOptions();
  const forbisMember =
    participant.organizationGroupSlug === "forbis" && participant.forbisMemberId
      ? await db.query.forbisMembers.findFirst({
          orderBy: (table) => [desc(table.updatedAt)],
          where: and(
            eq(forbisMembers.isActive, true),
            eq(forbisMembers.forbisMemberId, participant.forbisMemberId)
          ),
        })
      : null;
  const forbisBusinessDefaults = forbisMember
    ? {
        boothName: forbisMember.boothName || forbisMember.companyName || "",
        brandName: forbisMember.brandName || "",
        businessCategory: forbisMember.businessCategory || "",
        businessSector: forbisMember.businessSector || "",
        companyAddress: forbisMember.companyAddress || "",
        companyDescription: forbisMember.companyDescription || "",
        companyDistrictCode: forbisMember.companyDistrictCode || "",
        companyDistrictName: forbisMember.companyDistrictName || "",
        companyName: forbisMember.companyName || "",
        companyPhone: forbisMember.companyPhone || "",
        companyProvinceCode: forbisMember.companyProvinceCode || "",
        companyProvinceName: forbisMember.companyProvinceName || "",
        companyRegencyCode: forbisMember.companyRegencyCode || "",
        companyRegencyName: forbisMember.companyRegencyName || "",
        companyVillageCode: forbisMember.companyVillageCode || "",
        companyVillageName: forbisMember.companyVillageName || "",
        companyWhatsapp: forbisMember.companyWhatsapp || "",
        isBoothNameSameAsCompany:
          Boolean(forbisMember.companyName) &&
          (forbisMember.boothName === forbisMember.companyName || !forbisMember.boothName),
        legalEntity: forbisMember.legalEntity || "",
        partnershipConcepts: forbisMember.partnershipConcepts ?? [],
        productTags: forbisMember.productTags ?? [],
        requestedBoothCategorySlug: forbisMember.requestedBoothCategorySlug || "",
      }
    : undefined;

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/admin/peserta" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Kembali ke Daftar
        </Link>
        <Link 
          href={`/admin/peserta/${id}/edit`} 
          className={buttonVariants({ variant: "outline", className: "rounded-2xl gap-2" })}
        >
          <Pencil className="size-4" /> Edit Profil
        </Link>
      </div>

      <AdminPageHeader
        title={participant.name}
        description={`Terdaftar sejak ${participant.createdAt?.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      />

      <div className="space-y-6">
        <Card className="rounded-[32px] border-white/80 bg-white/90 shadow-sm ring-1 ring-black/5 overflow-hidden">
          <CardHeader className="bg-primary-50/50 border-b border-primary-100">
            <CardTitle className="text-sm flex items-center gap-2 text-primary-900">
              <UserCircle2 className="size-4" /> Data Pribadi
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Telepon</p>
              <div className="flex items-center gap-2 font-medium">
                <Phone className="size-3.5 text-primary-600" /> {participant.phone}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">WhatsApp</p>
              <div className="flex items-center gap-2 font-medium">
                <MessageSquare className="size-3.5 text-emerald-600" /> {participant.whatsapp}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status Alumni</p>
              <div className="flex items-center gap-2">
                {participant.isKmiAlumni ? (
                  <Badge variant="secondary" className="bg-primary-100 text-primary-800 border-none">
                    <GraduationCap className="size-3 mr-1" /> KMI {participant.kmiYear}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground font-normal">Umum / Bukan Alumni</Badge>
                )}
              </div>
            </div>
            {participant.forbisMemberId && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ID Forbis</p>
                <Badge variant="outline" className="font-mono text-[11px]">{participant.forbisMemberId}</Badge>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Organisasi</p>
              <Badge variant="outline" className="bg-muted/30 font-normal">
                {participant.organizationGroupName || "Belum dipilih"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[32px] border-white/80 bg-white/90 shadow-sm ring-1 ring-black/5 overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <div className="space-y-4">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-primary-900">
                    <Building2 className="size-5" /> Daftar Usaha ({participant.businesses.length})
                  </CardTitle>
                  <CardDescription>
                    Seluruh usaha yang terdaftar untuk peserta ini.
                  </CardDescription>
                </div>
                <AddBusinessButton
                  boothCategoryOptions={boothCategories}
                  defaultValues={forbisBusinessDefaults}
                  participantId={participant.id}
                  participantName={participant.name}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4">
            {participant.businesses.length === 0 ? (
              <div className="rounded-[32px] border-2 border-dashed p-12 text-center bg-white/50">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-2 text-muted-foreground">Belum ada data usaha yang terdaftar.</p>
              </div>
            ) : (
              participant.businesses.map((biz) => {
                const complete = !!(
                  biz.legalEntity && biz.businessCategory && biz.businessSector &&
                  biz.brandName && biz.companyDescription && biz.companyAddress &&
                  biz.productTags?.length && biz.partnershipConcepts?.length
                )
                const addr = [biz.companyAddress, biz.companyVillageName, biz.companyDistrictName, biz.companyRegencyName, biz.companyProvinceName].filter(Boolean).join(", ")
                return (
                <Card key={biz.id} className="rounded-[32px] border-white/80 bg-white/90 shadow-sm ring-1 ring-black/5">
                  <CardContent className="p-6 space-y-5">

                    {/* Header: logo + status + actions */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {biz.logoAssetId ? (
                          <PrivateImage assetId={biz.logoAssetId} alt={`Logo ${biz.companyName}`} className="size-14 rounded-2xl border border-border/50" />
                        ) : (
                          <div className="flex size-14 items-center justify-center rounded-2xl border border-border/50 bg-muted/20 text-[10px] italic text-muted-foreground">No Logo</div>
                        )}
                        <div>
                          <h4 className="text-lg font-bold text-foreground leading-tight">{biz.companyName}</h4>
                          {complete ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="size-3.5" />Data Lengkap</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"><AlertCircle className="size-3.5" />Belum Lengkap</span>
                          )}
                        </div>
                      </div>
                      <BusinessItemActions businessId={biz.id} participantId={participant.id} />
                    </div>

                    {/* Identitas Usaha */}
                    <div className="rounded-2xl bg-muted/20 p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600">Identitas Usaha</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Badan Hukum" value={biz.legalEntity} />
                        <Field label="Nama Brand / Merek" value={biz.brandName} />
                        <Field label="Nama di Booth" value={biz.boothName || biz.companyName} />
                        <Field label="Jenis Produk Pameran" value={biz.requestedBoothCategoryName} />
                        <Field label="Kategori Usaha" value={biz.businessCategory} />
                        <Field label="Bidang Usaha" value={biz.businessSector} />
                      </div>
                    </div>

                    {/* Tentang Perusahaan */}
                    <div className="rounded-2xl bg-muted/20 p-4 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600">Tentang Perusahaan</p>
                      {biz.companyDescription
                        ? <p className="text-sm leading-relaxed text-muted-foreground">{biz.companyDescription}</p>
                        : <p className="text-sm text-muted-foreground/50 italic">Belum diisi</p>}
                    </div>

                    {/* Kontak & Alamat */}
                    <div className="rounded-2xl bg-muted/20 p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600">Kontak & Alamat</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Telepon Perusahaan" value={biz.companyPhone} />
                        <Field label="WhatsApp Perusahaan" value={biz.companyWhatsapp} />
                      </div>
                      <Field label="Alamat" value={addr} />
                    </div>

                    {/* Produk & Kemitraan */}
                    <div className="rounded-2xl bg-muted/20 p-4 space-y-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600">Produk & Kemitraan</p>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Produk / Jasa</p>
                        {biz.productTags?.length
                          ? <div className="flex flex-wrap gap-1.5">{biz.productTags.map((tag) => <Badge key={tag} className="bg-primary-50 text-primary-700 border-none text-[11px]">{tag}</Badge>)}</div>
                          : <p className="text-sm text-muted-foreground/50 italic">Belum diisi</p>}
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Konsep Kemitraan</p>
                        {biz.partnershipConcepts?.length
                          ? <div className="flex flex-wrap gap-1.5">{biz.partnershipConcepts.map((item) => <Badge key={item} variant="outline" className="bg-muted/30 font-normal">{item}</Badge>)}</div>
                          : <p className="text-sm text-muted-foreground/50 italic">Belum diisi</p>}
                      </div>
                    </div>

                  </CardContent>
                </Card>
                )
              })
            )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      {value
        ? <p className="text-sm font-medium">{value}</p>
        : <p className="text-sm text-muted-foreground/50 italic">Belum diisi</p>}
    </div>
  )
}
