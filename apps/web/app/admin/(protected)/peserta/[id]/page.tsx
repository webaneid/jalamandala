import Link from "next/link";
import { ArrowLeft, Pencil, Building2, UserCircle2, Phone, MessageSquare, GraduationCap } from "lucide-react";
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
              participant.businesses.map((biz) => (
                <Card key={biz.id} className="rounded-[32px] border-white/80 bg-white/90 shadow-sm ring-1 ring-black/5 hover:ring-primary-200 transition-all">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        {biz.logoAssetId ? (
                          <PrivateImage
                            assetId={biz.logoAssetId}
                            alt={`Logo ${biz.companyName}`}
                            className="size-16 rounded-2xl border border-border/50"
                          />
                        ) : (
                          <div className="flex size-16 items-center justify-center rounded-2xl border border-border/50 bg-muted/20 text-[10px] italic text-muted-foreground">
                            No Logo
                          </div>
                        )}
                        <BusinessItemActions
                          businessId={biz.id}
                          participantId={participant.id}
                        />
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-bold text-primary-600 uppercase tracking-tighter">{biz.legalEntity}</p>
                          <h4 className="text-xl font-bold text-foreground">{biz.companyName}</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-muted/30 font-normal">{biz.businessCategory}</Badge>
                          <Badge variant="outline" className="bg-muted/30 font-normal">{biz.businessSector}</Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Brand/Merk</p>
                          <p className="text-sm font-medium">{biz.brandName}</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Nama Booth</p>
                            <p className="text-sm font-medium">{biz.boothName || biz.companyName}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Jenis Produk Pameran</p>
                            <p className="text-sm font-medium">
                              {biz.requestedBoothCategoryName || "Belum dipilih"}
                            </p>
                          </div>
                        </div>
                        {biz.companyDescription ? (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Tentang Perusahaan</p>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {biz.companyDescription}
                            </p>
                          </div>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Kontak Perusahaan</p>
                            <p className="text-sm font-medium">{biz.companyPhone || "-"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">WhatsApp Perusahaan</p>
                            <p className="text-sm font-medium">{biz.companyWhatsapp || "-"}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Alamat Perusahaan</p>
                          <p className="text-sm font-medium">
                            {[
                              biz.companyAddress,
                              biz.companyVillageName,
                              biz.companyDistrictName,
                              biz.companyRegencyName,
                              biz.companyProvinceName,
                            ]
                              .filter(Boolean)
                              .join(", ") || "-"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Produk/Jasa</p>
                          <div className="flex flex-wrap gap-1.5">
                            {biz.productTags?.map((tag) => (
                              <Badge key={tag} className="bg-primary-50 text-primary-700 hover:bg-primary-100 border-none text-[11px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Peluang Kemitraan</p>
                          <div className="flex flex-wrap gap-1.5">
                            {biz.partnershipConcepts?.map((item) => (
                              <Badge key={item} variant="outline" className="bg-muted/30 font-normal">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
