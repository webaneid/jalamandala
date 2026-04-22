"use client";

import * as React from "react";
import { Building2, CheckCircle2, Plus, UserCircle2 } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BusinessForm } from "@/components/forms/BusinessForm";
import { ParticipantForm } from "@/components/forms/ParticipantForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  BoothCategoryFormOption,
  BoothGroupFormOption,
} from "@/lib/booth-form-options";
import {
  mapForbisMemberToBusinessDefaults,
  type ForbisMemberOption,
} from "@/lib/forbis-members";

type TambahPesertaClientProps = {
  boothCategoryOptions: BoothCategoryFormOption[];
  boothGroupOptions: BoothGroupFormOption[];
};

export function TambahPesertaClient({
  boothCategoryOptions,
  boothGroupOptions,
}: TambahPesertaClientProps) {
  const [participantData, setParticipantData] = React.useState<any>(null);
  const [showBusinessForm, setShowBusinessForm] = React.useState(false);
  const [selectedForbisMember, setSelectedForbisMember] =
    React.useState<ForbisMemberOption | null>(null);

  const handleParticipantSuccess = (data: any) => {
    setParticipantData(data);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-20">
      <AdminPageHeader
        align="centered"
        badge="System Ready"
        description="Silakan lengkapi identitas pribadi terlebih dahulu sebelum menambahkan data usaha."
        eyebrow="Manual Entry"
        title="Pendaftaran Peserta Expo"
      />

      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
              <UserCircle2 className="size-6" />
            </div>
            <h2 className="text-xl font-bold text-primary-900">Identitas Pribadi</h2>
            {participantData ? <CheckCircle2 className="size-5 text-emerald-500" /> : null}
          </div>

          {!participantData ? (
            <ParticipantForm
              boothGroupOptions={boothGroupOptions}
              onForbisMemberSelect={setSelectedForbisMember}
              onSuccess={handleParticipantSuccess}
            />
          ) : (
            <Card className="rounded-[32px] border-emerald-100 bg-emerald-50/30">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-800">Identitas Tersimpan</p>
                  <h3 className="text-lg font-bold text-emerald-950">
                    {participantData.name || participantData.fullName}
                  </h3>
                </div>
                <Button
                  className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  onClick={() => setParticipantData(null)}
                  size="sm"
                  variant="outline"
                >
                  Edit Data
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {participantData ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3 px-2">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
                  <Building2 className="size-6" />
                </div>
                <h2 className="text-xl font-bold text-primary-900">Daftar Usaha</h2>
              </div>
              {!showBusinessForm ? (
                <Button
                  className="gap-2 rounded-2xl bg-primary-600"
                  onClick={() => setShowBusinessForm(true)}
                >
                  <Plus className="size-4" /> Tambah Usaha Baru
                </Button>
              ) : null}
            </div>

            {showBusinessForm ? (
              <div className="space-y-4">
                <BusinessForm
                  boothCategoryOptions={boothCategoryOptions}
                  defaultValues={mapForbisMemberToBusinessDefaults(selectedForbisMember)}
                  key={selectedForbisMember?.id ?? "manual-business"}
                  onSuccess={() => {
                    setShowBusinessForm(false);
                  }}
                  participantId={participantData.id}
                  participantName={participantData.name || participantData.fullName}
                />
                <div className="flex justify-center">
                  <Button
                    className="text-muted-foreground"
                    onClick={() => setShowBusinessForm(false)}
                    variant="ghost"
                  >
                    Batal Menambah Usaha
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[32px] border-2 border-dashed border-muted-foreground/20 bg-muted/5 p-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <h4 className="mt-4 font-medium text-foreground">Belum ada data usaha</h4>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Data pribadi sudah tersimpan. Tambahkan usaha peserta di section ini.
                </p>
                <Button
                  className="mt-6 h-11 rounded-2xl bg-primary-600 px-8 shadow-lg shadow-primary-200"
                  onClick={() => setShowBusinessForm(true)}
                >
                  Tambah Usaha Pertama
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
