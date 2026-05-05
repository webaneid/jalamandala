/**
 * repair-bookings.ts
 *
 * Repairs booth_bookings and booth status that were corrupted by the old
 * deleteInvoiceCompletely bug (deleted all bookings by participantId).
 *
 * Run: cd packages/db && bun run src/repair-bookings.ts
 */

import 'dotenv/config'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { createTenantDb } from './client'
import { boothBookings, booths, invoiceItems, invoices, orders } from './schema/tenant'

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? 'expo_forbis2026'
const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log(`\n=== Repair Bookings — schema: ${TENANT_SCHEMA} ===`)
  console.log(DRY_RUN ? '  MODE: DRY RUN (tidak ada perubahan)\n' : '  MODE: LIVE — perubahan akan disimpan\n')

  const tenantDb = await createTenantDb(TENANT_SCHEMA)

  // 1. Ambil semua invoice yang aktif/paid beserta items-nya
  const activeStatuses = ['paid', 'dp_paid', 'waiting_for_payment', 'waiting_confirmation', 'dp_waiting_confirmation', 'balance_waiting_confirmation', 'balance_overdue']
  const allInvoices = await tenantDb.query.invoices.findMany({
    where: (t, { inArray }) => inArray(t.status, activeStatuses),
    with: {
      items: true,
      order: true,
    },
  })

  console.log(`Ditemukan ${allInvoices.length} invoice aktif/paid\n`)

  let missingBookings = 0
  let fixedBookings = 0
  let fixedBoothStatus = 0

  for (const invoice of allInvoices) {
    const boothItems = invoice.items.filter(i => i.itemType === 'booth_booking' && i.referenceId)
    if (boothItems.length === 0) continue

    const bookingIds = boothItems.map(i => i.referenceId as string)

    // Cek boothBookings yang masih ada
    const existingBookings = await tenantDb
      .select({ id: boothBookings.id, boothId: boothBookings.boothId })
      .from(boothBookings)
      .where(inArray(boothBookings.id, bookingIds))

    const existingIds = new Set(existingBookings.map(b => b.id))
    const missingIds = bookingIds.filter(id => !existingIds.has(id))

    if (missingIds.length > 0) {
      missingBookings += missingIds.length
      console.log(`⚠️  Invoice ${invoice.invoiceNumber} (${invoice.status}): ${missingIds.length} boothBookings HILANG`)

      // Rekonstruksi dari invoiceItems — cari booth by code
      for (const item of boothItems) {
        if (!item.referenceId || existingIds.has(item.referenceId)) continue

        // Cari booth berdasarkan kode (title di invoiceItems)
        const boothCode = item.title
        const booth = await tenantDb.query.booths.findFirst({
          where: (t, { eq }) => eq(t.code, boothCode),
        })

        if (!booth) {
          console.log(`   ❌ Booth dengan kode "${boothCode}" tidak ditemukan — skip`)
          continue
        }

        const businessId = invoice.order?.businessId ?? invoice.businessId
        const participantId = invoice.participantId

        if (!businessId || !participantId) {
          console.log(`   ❌ Invoice ${invoice.invoiceNumber} tidak punya businessId/participantId — skip`)
          continue
        }

        console.log(`   → Recreate boothBooking: booth ${boothCode} untuk invoice ${invoice.invoiceNumber}`)

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
          fixedBookings++
        }

        // Update booth status
        const expectedStatus = invoice.status === 'paid' ? 'booked' : 'reserved'
        console.log(`   → Set booth ${boothCode} status = ${expectedStatus}`)

        if (!DRY_RUN) {
          await tenantDb
            .update(booths)
            .set({ status: expectedStatus, updatedAt: new Date() })
            .where(eq(booths.id, booth.id))
          fixedBoothStatus++
        }
      }
    }

    // Juga pastikan booth status sesuai untuk booking yang ADA tapi booth-nya wrong state
    if (existingBookings.length > 0) {
      const expectedStatus = invoice.status === 'paid' ? 'booked' : 'reserved'
      const boothIdsToFix = existingBookings.map(b => b.boothId)

      // Cek booth status saat ini
      const currentBooths = await tenantDb
        .select({ id: booths.id, code: booths.code, status: booths.status })
        .from(booths)
        .where(inArray(booths.id, boothIdsToFix))

      for (const booth of currentBooths) {
        if (booth.status !== expectedStatus) {
          console.log(`   ⚠️  Booth ${booth.code}: status "${booth.status}" → seharusnya "${expectedStatus}"`)
          if (!DRY_RUN) {
            await tenantDb
              .update(booths)
              .set({ status: expectedStatus, updatedAt: new Date() })
              .where(eq(booths.id, booth.id))
            fixedBoothStatus++
          }
        }
      }
    }
  }

  console.log('\n=== Ringkasan ===')
  console.log(`boothBookings hilang   : ${missingBookings}`)
  console.log(`boothBookings direkonstruksi : ${DRY_RUN ? '(dry run)' : fixedBookings}`)
  console.log(`booth status diperbaiki      : ${DRY_RUN ? '(dry run)' : fixedBoothStatus}`)

  if (DRY_RUN && (missingBookings > 0)) {
    console.log('\nJalankan tanpa --dry-run untuk apply perubahan:')
    console.log('  bun run src/repair-bookings.ts')
  }

  console.log('\nSelesai.\n')
  process.exit(0)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
