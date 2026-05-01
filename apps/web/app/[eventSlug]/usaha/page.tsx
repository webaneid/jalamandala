import Link from "next/link"
import { db } from "@repo/db"
import { participantBusinesses } from "@repo/db/schema/public"
import { eq } from "drizzle-orm"
import { getCurrentParticipantSession } from "@/lib/participant-session"
import { getPublicButtonClassName } from "@/components/public/ui/PublicButton"

interface Props {
  params: Promise<{ eventSlug: string }>
}


export const metadata = {
  title: "Usaha Saya",
};

export default async function UsahaPage({ params }: Props) {
  const { eventSlug } = await params
  const session = await getCurrentParticipantSession()

  const businesses = await db.query.participantBusinesses.findMany({
    where: eq(participantBusinesses.participantId, session!.participantId),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usaha Saya</h1>
          <p className="mt-1 text-sm text-slate-500">{businesses.length} usaha terdaftar</p>
        </div>
        <Link className={getPublicButtonClassName({ className: "h-10 px-4 text-sm" })} href={`/${eventSlug}/usaha/baru`}>
          + Tambah Usaha
        </Link>
      </div>

      {businesses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
          <p className="text-slate-500">Belum ada usaha terdaftar.</p>
          <Link
            className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
            href={`/${eventSlug}/usaha/baru`}
          >
            Tambah Usaha Pertama →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {businesses.map((biz) => (
            <li key={biz.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div>
                <p className="font-semibold text-slate-900">{biz.companyName}</p>
                {biz.boothName && biz.boothName !== biz.companyName && (
                  <p className="text-sm text-slate-500">Booth: {biz.boothName}</p>
                )}
                {(biz.productTags?.length ?? 0) > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {biz.productTags!.map((tag) => (
                      <span key={tag} className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Link
                className="ml-4 shrink-0 text-sm font-medium text-primary hover:underline"
                href={`/${eventSlug}/usaha/${biz.id}/lengkapi`}
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-2">
        <Link className="text-sm text-slate-500 hover:text-slate-700" href={`/${eventSlug}/dashboard`}>
          ← Kembali ke Dashboard
        </Link>
      </div>
    </div>
  )
}
