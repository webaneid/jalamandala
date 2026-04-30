import { db } from "@repo/db";
import { participants } from "@repo/db/schema/public";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ParticipantForm } from "@/components/forms/ParticipantForm";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getBoothFormOptions } from "@/lib/booth-form-options";
import { ResetPasswordForm } from "@/components/admin/peserta/ResetPasswordForm";


export const metadata = {
  title: "Edit Peserta",
};

export default async function ParticipantEditPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, id),
  });

  if (!participant) {
    notFound();
  }

  // Map DB fields to Form fields
  const defaultValues = {
    fullName: participant.name,
    phone: participant.phone,
    whatsapp: participant.whatsapp,
    isSameAsPhone: participant.phone === participant.whatsapp,
    isKmiAlumni: participant.isKmiAlumni ? "Ya" : "Bukan",
    kmiYear: participant.kmiYear || "",
    forbisMemberId: participant.forbisMemberId || "",
    organizationGroupId: participant.organizationGroupId || "",
  };
  const { boothGroups } = await getBoothFormOptions();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 pb-20">
      <AdminPageHeader
        align="centered"
        eyebrow="Edit Mode"
        title="Perbarui Data Peserta"
        description={`Mengubah informasi untuk ${participant.name}`}
      />

      <ParticipantForm
        boothGroupOptions={boothGroups}
        participantId={id}
        defaultValues={defaultValues as any}
      />

      <ResetPasswordForm participantId={id} />
    </div>
  );
}
