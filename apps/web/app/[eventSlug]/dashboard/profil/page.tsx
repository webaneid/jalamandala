import Link from "next/link"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@repo/db"
import { participants, participantTermsApprovals } from "@repo/db/schema/public"
import { getCurrentParticipantSession } from "@/lib/participant-session"
import { LogoutButton } from "@/components/public/LogoutButton"

const fmtDate = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(d) : "—"

export default async function DashboardProfilPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const session = await getCurrentParticipantSession()

  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, session!.participantId),
    columns: {
      name: true,
      email: true,
      phone: true,
      whatsapp: true,
      organizationGroupName: true,
      organizationGroupSlug: true,
      isKmiAlumni: true,
      kmiYear: true,
      whatsappVerifiedAt: true,
    },
  })

  const termsApprovals = await db.query.participantTermsApprovals.findMany({
    where: eq(participantTermsApprovals.participantId, session!.participantId),
    orderBy: (t, { desc }) => [desc(t.approvedAt)],
  })

  const initials = (participant?.name ?? "?")
    .split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()

  return (
    <div className="min-h-full pb-8">
      {/* Profile hero */}
      <div className="bg-[#134397] px-5 pt-14 pb-8">
        <div className="flex flex-col items-center text-center">
          <div className="size-20 rounded-full bg-[#00adee] border-4 border-white/30 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>
          <h1 className="mt-3 text-xl font-bold text-white">{participant?.name ?? "—"}</h1>
          <p className="text-sm text-blue-200 mt-0.5">{participant?.organizationGroupName ?? ""}</p>
          {participant?.whatsappVerifiedAt && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 px-3 py-0.5 text-xs font-medium text-emerald-200">
              <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              WhatsApp Terverifikasi
            </span>
          )}
        </div>
      </div>

      <div className="px-4 space-y-4 -mt-1 pt-5">
        {/* Info kontak */}
        <section className="rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Informasi Kontak</p>
          <InfoRow icon="📱" label="WhatsApp" value={participant?.whatsapp ?? "—"} />
          <InfoRow icon="📞" label="Telepon" value={participant?.phone ?? "—"} />
          <InfoRow icon="✉️" label="Email" value={participant?.email ?? "Belum diisi"} />
          {participant?.isKmiAlumni && (
            <InfoRow icon="🎓" label="Alumni KMI" value={participant.kmiYear ? `Angkatan ${participant.kmiYear}` : "Ya"} />
          )}
        </section>

        {/* Syarat & Ketentuan */}
        <section className="rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Dokumen yang Ditandatangani</p>
          {termsApprovals.length === 0 ? (
            <div className="px-4 pb-4">
              <p className="text-sm text-slate-500">Belum ada dokumen yang ditandatangani.</p>
            </div>
          ) : (
            termsApprovals.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 border-t border-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">Syarat & Ketentuan</p>
                  <p className="text-xs text-slate-500">Ditandatangani: {fmtDate(t.approvedAt)}</p>
                </div>
                <Link
                  href={`/${eventSlug}/syarat-ketentuan`}
                  className="shrink-0 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Lihat PDF
                </Link>
              </div>
            ))
          )}
        </section>

        {/* Menu lainnya */}
        <section className="rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Lainnya</p>
          <MenuRow href={`/${eventSlug}/agenda`} icon="📅" label="Agenda Event" />
          <MenuRow href={`/${eventSlug}/syarat-ketentuan`} icon="📄" label="Syarat & Ketentuan" />
          <MenuRow href={`/${eventSlug}/kebijakan-privasi`} icon="🔒" label="Kebijakan Privasi" />
        </section>

        {/* Logout */}
        <div className="pt-2">
          <LogoutButton eventSlug={eventSlug} />
        </div>

        <p className="text-center text-xs text-slate-400 pb-2">
          Versi 1.0 · Jalamandala by Webane Indonesia
        </p>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-50">
      <span className="text-base">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800 truncate">{value}</p>
      </div>
    </div>
  )
}

function MenuRow({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 border-t border-slate-50 hover:bg-slate-50 transition"
    >
      <span className="text-base">{icon}</span>
      <span className="flex-1 text-sm font-medium text-slate-700">{label}</span>
      <svg className="size-4 text-slate-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M9 6l6 6-6 6" strokeLinecap="round" />
      </svg>
    </Link>
  )
}
