import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { createTenantDb } from '@repo/db'
import { boothGroups } from '@repo/db/schema/tenant'
import { getCurrentParticipantSession } from '@/lib/participant-session'
import { PublicParticipantAuthForm } from '@/components/public/PublicParticipantAuthForm'
import { PublicContainer } from '@/components/public/ui/PublicContainer'
import { SectionHeader } from '@/components/public/ui/SectionHeader'
import { FormSectionCard } from '@/components/public/ui/FormSectionCard'

export const metadata = {
  title: 'Masuk — Peserta Expo',
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
  const organizationOptions = await tenantDb.query.boothGroups.findMany({
    where: eq(boothGroups.isActive, true),
    orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
  })

  return (
    <PublicContainer size="sm" className="py-12 sm:py-16">
      <div className="mx-auto flex min-h-[70vh] items-center justify-center">
        <div className="w-full space-y-6">
          <SectionHeader
            align="center"
            eyebrow="Akses Peserta"
            title="Masuk atau Daftar Peserta"
          />
          <FormSectionCard className="mx-auto max-w-md" contentClassName="pt-6">
            <PublicParticipantAuthForm
              eventSlug={eventSlug}
              initialMode={initialMode}
              organizationOptions={organizationOptions.map((group) => ({
                id: group.id,
                label: group.name,
                slug: group.slug,
              }))}
              redirectTo={redirectTo}
            />
          </FormSectionCard>
        </div>
      </div>
    </PublicContainer>
  )
}
