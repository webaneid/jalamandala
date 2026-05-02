import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { createTenantDb } from '@repo/db'
import { boothGroups } from '@repo/db/schema/tenant'
import { getCurrentParticipantSession } from '@/lib/participant-session'
import { PublicParticipantAuthForm } from '@/components/public/PublicParticipantAuthForm'
import { PublicContainer } from '@/components/public/ui/PublicContainer'

export const metadata = {
  title: 'Masuk',
}

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? 'expo_forbis2026'

interface Props {
  params: Promise<{ eventSlug: string }>
  searchParams?: Promise<{ mode?: string; next?: string }>
}

function resolveSafeNext(eventSlug: string, value?: string) {
  if (!value) return `/${eventSlug}/dashboard`
  if (!value.startsWith(`/${eventSlug}/`)) return `/${eventSlug}/dashboard`
  if (value.startsWith(`/${eventSlug}/login`)) return `/${eventSlug}/dashboard`
  return value
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { eventSlug } = await params
  const resolvedSearchParams = await searchParams
  const redirectTo = resolveSafeNext(eventSlug, resolvedSearchParams?.next)
  const initialMode = resolvedSearchParams?.mode === 'register' ? 'register' : 'login'

  const session = await getCurrentParticipantSession()
  if (session?.eventSlug === eventSlug) {
    redirect(redirectTo)
  }

  const tenantDb = await createTenantDb(TENANT_SCHEMA)
  const INTERNAL_GROUP_SLUGS = ["vip-b"]
  const organizationOptions = (await tenantDb.query.boothGroups.findMany({
    where: eq(boothGroups.isActive, true),
    orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
  })).filter((g) => !INTERNAL_GROUP_SLUGS.includes(g.slug))

  return (
    <PublicContainer className="py-14">
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-sm space-y-6">
          {/* Header */}
          <div className="space-y-1 text-center">
            <span className="inline-flex items-center rounded-full bg-[#00adee]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00adee]">
              Akses Peserta
            </span>
            <h1 className="text-2xl font-bold text-white">Masuk atau Daftar Peserta</h1>
          </div>

          {/* Auth card */}
          <div className="rounded-3xl border border-white/10 bg-white/6 p-6 backdrop-blur-sm">
            <PublicParticipantAuthForm
              eventSlug={eventSlug}
              initialMode={initialMode}
              organizationOptions={organizationOptions.map((group) => ({
                id: group.id,
                label: group.slug === "gontor" ? "Internal Gontor" : group.slug === "general" ? "Umum/Alumni" : group.name,
                slug: group.slug,
              }))}
              redirectTo={redirectTo}
            />
          </div>
        </div>
      </div>
    </PublicContainer>
  )
}
