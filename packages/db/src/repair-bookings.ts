/**
 * repair-bookings.ts
 *
 * Dua tugas:
 * 1. CLEANUP — hapus boothBookings yang terikat invoice expired/cancelled,
 *    reset booth status yang salah
 * 2. RESTORE — recreate boothBookings yang hilang untuk invoice aktif/paid
 *
 * Run: cd packages/db && bun run src/repair-bookings.ts [--dry-run]
 */

import 'dotenv/config'
import { eq, inArray, sql } from 'drizzle-orm'
import { createTenantDb } from './client'
import { boothBookings, booths, invoiceItems, invoices } from './schema/tenant'

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? 'expo_forbis2026'
const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log(`\n=== Repair Bookings — schema: ${TENANT_SCHEMA} ===`)
  console.log(DRY_RUN ? '  MODE: DRY RUN (tidak ada perubahan)\n' : '  MODE: LIVE — perubahan akan disimpan\n')

  const tenantDb = await createTenantDb(TENANT_SCHEMA)

  // ─── FASE 1: Cleanup stale bookings dari invoice expired/cancelled ───

  console.log('── Fase 1: Cleanup boothBookings dari invoice expired/cancelled ──')

  const staleStatuses = ['expired', 'cancelled', 'refunded']
  const staleInvoices = await tenantDb.query.invoices.findMany({
    where: (t, { inArray }) => inArray(t.status, staleStatuses),
    with: { items: true },
  })

  let staleFound = 0
  let staleDeleted = 0
  let boothsFixed = 0

  for (const invoice of staleInvoices) {
    const bookingIds = invoice.items
      .filter(i => i.itemType === 'booth_booking' && i.referenceId)
      .map(i => i.referenceId as string)

    if (bookingIds.length === 0) continue

    const existingBookings = await tenantDb
      .select({ id: boothBookings.id, boothId: boothBookings.boothId })
      .from(boothBookings)
      .where(inArray(boothBookings.id, bookingIds))

    if (existingBookings.length === 0) continue

    staleFound += existingBookings.length
    console.log(`⚠️  Invoice ${invoice.invoiceNumber} (${invoice.status}): ${existingBookings.length} stale boothBookings ditemukan`)

    const boothIds = existingBookings.map(b => b.boothId)

    if (!DRY_RUN) {
      await tenantDb.delete(boothBookings).where(inArray(boothBookings.id, bookingIds))
      staleDeleted += existingBookings.length
    }

    // Fix booth status untuk setiap booth yang terdampak
    for (const boothId of boothIds) {
      const booth = await tenantDb.query.booths.findFirst({
        where: (t, { eq }) => eq(t.id, boothId),
        columns: { id: true, code: true, status: true },
      })
      if (!booth) continue

      const otherBooking = DRY_RUN ? null : await tenantDb.query.boothBookings.findFirst({
        where: eq(boothBookings.boothId, boothId),
        columns: { id: true, invoiceId: true },
      })

      let expectedStatus: string
      if (!otherBooking) {
        expectedStatus = 'open'
      } else if (otherBooking.invoiceId) {
        const linked = await tenantDb.query.invoices.findFirst({
          where: eq(invoices.id, otherBooking.invoiceId),
          columns: { status: true },
        })
        expectedStatus = linked?.status === 'paid' ? 'booked' : 'reserved'
      } else {
        expectedStatus = 'reserved'
      }

      if (booth.status !== expectedStatus) {
        console.log(`   → Booth ${booth.code}: "${booth.status}" → "${expectedStatus}"`)
        if (!DRY_RUN) {
          await tenantDb.update(booths).set({ status: expectedStatus, updatedAt: new Date() }).where(eq(booths.id, boothId))
          boothsFixed++
        }
      } else if (DRY_RUN) {
        console.log(`   → Booth ${booth.code}: akan di-reset ke "open" (stale booking dihapus)`)
      }
    }
  }

  if (staleFound === 0) console.log('  Tidak ada stale boothBookings.\n')

  // ─── FASE 2: Restore boothBookings yang hilang untuk invoice aktif/paid ───

  console.log('\n── Fase 2: Restore boothBookings yang hilang ──')

  const activeStatuses = ['paid', 'dp_paid', 'waiting_for_payment', 'waiting_confirmation', 'dp_waiting_confirmation', 'balance_waiting_confirmation', 'balance_overdue']
  const activeInvoices = await tenantDb.query.invoices.findMany({
    where: (t, { inArray }) => inArray(t.status, activeStatuses),
    with: { items: true, order: true },
  })

  let missingBookings = 0
  let restoredBookings = 0
  let boothsRestored = 0

  for (const invoice of activeInvoices) {
    const boothItems = invoice.items.filter(i => i.itemType === 'booth_booking' && i.referenceId)
    if (boothItems.length === 0) continue

    const bookingIds = boothItems.map(i => i.referenceId as string)
    const existingBookings = await tenantDb
      .select({ id: boothBookings.id, boothId: boothBookings.boothId })
      .from(boothBookings)
      .where(inArray(boothBookings.id, bookingIds))

    const existingIds = new Set(existingBookings.map(b => b.id))
    const missingItems = boothItems.filter(i => !existingIds.has(i.referenceId!))

    if (missingItems.length > 0) {
      missingBookings += missingItems.length
      console.log(`⚠️  Invoice ${invoice.invoiceNumber} (${invoice.status}): ${missingItems.length} boothBookings HILANG`)

      for (const item of missingItems) {
        const booth = await tenantDb.query.booths.findFirst({
          where: (t, { eq }) => eq(t.code, item.title),
        })

        if (!booth) {
          console.log(`   ❌ Booth "${item.title}" tidak ditemukan — skip`)
          continue
        }

        const businessId = invoice.order?.businessId ?? invoice.businessId
        const participantId = invoice.participantId

        if (!businessId || !participantId) {
          console.log(`   ❌ Invoice ${invoice.invoiceNumber} tidak punya businessId/participantId — skip`)
          continue
        }

        console.log(`   → Recreate boothBooking: booth ${item.title}`)

        if (!DRY_RUN) {
          await tenantDb.execute(sql`
            INSERT INTO booth_bookings (id, booth_id, participant_id, business_id, booking_status, price_category, base_price, final_price, invoice_id, booked_at, created_at, updated_at)
            VALUES (
              ${item.referenceId}::uuid,
              ${booth.id}::uuid,
              ${participantId}::uuid,
              ${businessId}::uuid,
              'booked',
              'public',
              ${item.unitPrice},
              ${item.unitPrice},
              ${invoice.id},
              NOW(), NOW(), NOW()
            )
            ON CONFLICT (id) DO NOTHING
          `)
          restoredBookings++
        }

        const expectedStatus = invoice.status === 'paid' ? 'booked' : 'reserved'
        console.log(`   → Set booth ${item.title} status = ${expectedStatus}`)
        if (!DRY_RUN) {
          await tenantDb.update(booths).set({ status: expectedStatus, updatedAt: new Date() }).where(eq(booths.id, booth.id))
          boothsRestored++
        }
      }
    }

    // Cek booth status yang salah untuk booking yang sudah ada
    if (existingBookings.length > 0) {
      const expectedStatus = invoice.status === 'paid' ? 'booked' : 'reserved'
      const boothIds = existingBookings.map(b => b.boothId)
      const currentBooths = await tenantDb
        .select({ id: booths.id, code: booths.code, status: booths.status })
        .from(booths)
        .where(inArray(booths.id, boothIds))

      for (const booth of currentBooths) {
        if (booth.status !== expectedStatus) {
          console.log(`   ⚠️  Booth ${booth.code}: status "${booth.status}" → seharusnya "${expectedStatus}"`)
          if (!DRY_RUN) {
            await tenantDb.update(booths).set({ status: expectedStatus, updatedAt: new Date() }).where(eq(booths.id, booth.id))
            boothsRestored++
          }
        }
      }
    }
  }

  if (missingBookings === 0) console.log('  Tidak ada boothBookings yang hilang.\n')

  // ─── Ringkasan ───

  console.log('\n=== Ringkasan ===')
  console.log(`Stale bookings ditemukan    : ${staleFound}`)
  console.log(`Stale bookings dihapus      : ${DRY_RUN ? '(dry run)' : staleDeleted}`)
  console.log(`boothBookings hilang        : ${missingBookings}`)
  console.log(`boothBookings direkonstruksi: ${DRY_RUN ? '(dry run)' : restoredBookings}`)
  console.log(`Booth status diperbaiki     : ${DRY_RUN ? '(dry run)' : boothsFixed + boothsRestored}`)

  if (DRY_RUN && (staleFound > 0 || missingBookings > 0)) {
    console.log('\nJalankan tanpa --dry-run untuk apply:')
    console.log('  bun run src/repair-bookings.ts')
  }

  console.log('\nSelesai.\n')
  process.exit(0)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
