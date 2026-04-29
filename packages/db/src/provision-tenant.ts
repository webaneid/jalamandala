import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';

import { db } from './client';
import { expoEvents } from './schema/public';

dotenv.config({ path: '../../.env' });

function assertValidSchemaName(schemaName: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName)) {
    throw new Error(`Nama schema tenant tidak valid: ${schemaName}`);
  }
}

async function resolveTenantSchemaName() {
  const explicitSchemaName = process.argv[2] ?? process.env.TENANT_SCHEMA;

  if (explicitSchemaName) {
    return explicitSchemaName;
  }

  const activeEvent = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.isActive, true),
  });

  if (!activeEvent?.schemaName) {
    throw new Error(
      'Schema tenant tidak ditemukan. Berikan argumen schema atau set TENANT_SCHEMA.'
    );
  }

  return activeEvent.schemaName;
}

async function provisionTenantSchema() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  const schemaName = await resolveTenantSchemaName();
  assertValidSchemaName(schemaName);

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    console.log(`Provisioning tenant schema: ${schemaName}`);

    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    await sql.unsafe(`SET search_path TO "${schemaName}", public`);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS zones (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        slug text NOT NULL,
        description text,
        location text,
        image_asset_id uuid,
        color_code text,
        sort_order integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(
      `ALTER TABLE "${schemaName}".zones ADD COLUMN IF NOT EXISTS location text`
    );
    await sql.unsafe(
      `ALTER TABLE "${schemaName}".zones ADD COLUMN IF NOT EXISTS image_asset_id uuid`
    );
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS zones_slug_unique ON "${schemaName}".zones (slug)`
    );

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS booth_groups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text NOT NULL,
        name text NOT NULL,
        description text,
        default_price_group text,
        sort_order integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS booth_groups_slug_unique ON "${schemaName}".booth_groups (slug)`
    );

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS booth_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text NOT NULL,
        name text NOT NULL,
        description text,
        sort_order integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS booth_categories_slug_unique ON "${schemaName}".booth_categories (slug)`
    );

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS booths (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
        booth_group_id uuid,
        booth_category_id uuid,
        code text NOT NULL,
        name text NOT NULL,
        description text,
        status text NOT NULL DEFAULT 'open',
        sort_order integer NOT NULL DEFAULT 0,
        x integer,
        y integer,
        width integer,
        height integer,
        rotation integer NOT NULL DEFAULT 0,
        shape text NOT NULL DEFAULT 'rect',
        notes text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS booths_code_unique ON "${schemaName}".booths (code)`
    );
    await sql.unsafe(
      `ALTER TABLE "${schemaName}".booths ADD COLUMN IF NOT EXISTS booth_group_id uuid`
    );
    await sql.unsafe(
      `ALTER TABLE "${schemaName}".booths ADD COLUMN IF NOT EXISTS booth_category_id uuid`
    );

    await sql.unsafe(`
      INSERT INTO "${schemaName}".booth_groups
        (slug, name, description, default_price_group, sort_order, is_active)
      VALUES
        ('general', 'Umum', 'Booth untuk peserta umum.', 'public', 1, true),
        ('forbis', 'FORBIS', 'Booth khusus ekosistem FORBIS.', 'forbis', 2, true),
        ('fpag', 'FPAG', 'Booth kerja sama FPAG.', 'forbis', 3, true),
        ('formaqin', 'FORMAQIN', 'Booth kerja sama FORMAQIN.', 'forbis', 4, true),
        ('sponsor', 'Sponsor', 'Booth khusus sponsor.', 'sponsor', 5, true),
        ('gontor', 'Gontor', 'Booth khusus ekosistem Gontor.', null, 6, true)
      ON CONFLICT (slug) DO UPDATE
      SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        default_price_group = EXCLUDED.default_price_group,
        sort_order = EXCLUDED.sort_order,
        is_active = true,
        updated_at = now()
    `);

    await sql.unsafe(`
      INSERT INTO "${schemaName}".booth_categories
        (slug, name, description, sort_order, is_active)
      VALUES
        ('free', 'Bebas', 'Booth untuk penggunaan bebas, termasuk FnB dan non-FnB.', 1, true),
        ('non_fnb', 'Non FnB', 'Booth khusus selain makanan dan minuman.', 2, true),
        ('fnb_dry_food', 'FnB Dry Food', 'Booth FnB siap saji atau tanpa dapur aktif.', 3, true),
        ('fnb_kitchen', 'FnB Kitchen', 'Booth FnB yang membutuhkan proses masak di tempat.', 4, true)
      ON CONFLICT (slug) DO UPDATE
      SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order,
        is_active = true,
        updated_at = now()
    `);

    await sql.unsafe(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = '${schemaName}'
            AND table_name = 'booths'
            AND column_name = 'allocation_type'
        ) THEN
          UPDATE "${schemaName}".booths
          SET booth_group_id = bg.id
          FROM "${schemaName}".booth_groups bg
          WHERE booths.booth_group_id IS NULL
            AND bg.slug = CASE booths.allocation_type
              WHEN 'fpag_only' THEN 'fpag'
              WHEN 'formaqin_only' THEN 'formaqin'
              WHEN 'sponsor_only' THEN 'sponsor'
              WHEN 'gontor_only' THEN 'gontor'
              ELSE 'general'
            END;
        END IF;
      END $$;
    `);

    await sql.unsafe(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = '${schemaName}'
            AND table_name = 'booths'
            AND column_name = 'booth_type'
        ) THEN
          UPDATE "${schemaName}".booths
          SET booth_category_id = bc.id
          FROM "${schemaName}".booth_categories bc
          WHERE booths.booth_category_id IS NULL
            AND bc.slug = CASE booths.booth_type
              WHEN 'fnb' THEN 'fnb_dry_food'
              ELSE 'free'
            END;
        END IF;
      END $$;
    `);

    await sql.unsafe(`
      UPDATE "${schemaName}".booths
      SET booth_category_id = bc_target.id
      FROM "${schemaName}".booth_categories bc_target
      WHERE bc_target.slug = 'free'
        AND booths.booth_category_id IN (
          SELECT id FROM "${schemaName}".booth_categories WHERE slug = 'general'
        )
    `);

    await sql.unsafe(`
      UPDATE "${schemaName}".booths
      SET booth_group_id = bg.id
      FROM "${schemaName}".booth_groups bg
      WHERE booths.booth_group_id IS NULL
        AND bg.slug = 'general'
    `);

    await sql.unsafe(`
      UPDATE "${schemaName}".booths
      SET booth_category_id = bc.id
      FROM "${schemaName}".booth_categories bc
      WHERE booths.booth_category_id IS NULL
        AND bc.slug = 'free'
    `);

    await sql.unsafe(
      `UPDATE "${schemaName}".booths SET status = 'open' WHERE status = 'available'`
    );
    await sql.unsafe(
      `ALTER TABLE "${schemaName}".booths ALTER COLUMN status SET DEFAULT 'open'`
    );
    await sql.unsafe(
      `ALTER TABLE "${schemaName}".booths ALTER COLUMN booth_group_id SET NOT NULL`
    );
    await sql.unsafe(
      `ALTER TABLE "${schemaName}".booths ALTER COLUMN booth_category_id SET NOT NULL`
    );

    await sql.unsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'booths_booth_group_id_fkey'
            AND connamespace = '"${schemaName}"'::regnamespace
        ) THEN
          ALTER TABLE "${schemaName}".booths
          ADD CONSTRAINT booths_booth_group_id_fkey
          FOREIGN KEY (booth_group_id) REFERENCES "${schemaName}".booth_groups(id)
          ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await sql.unsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'booths_booth_category_id_fkey'
            AND connamespace = '"${schemaName}"'::regnamespace
        ) THEN
          ALTER TABLE "${schemaName}".booths
          ADD CONSTRAINT booths_booth_category_id_fkey
          FOREIGN KEY (booth_category_id) REFERENCES "${schemaName}".booth_categories(id)
          ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await sql.unsafe(
      `ALTER TABLE "${schemaName}".booths DROP COLUMN IF EXISTS booth_type`
    );
    await sql.unsafe(
      `ALTER TABLE "${schemaName}".booths DROP COLUMN IF EXISTS allocation_type`
    );
    await sql.unsafe(`DROP TABLE IF EXISTS "${schemaName}".booth_prices`);
    await sql.unsafe(`DELETE FROM "${schemaName}".booth_categories WHERE slug = 'general'`);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS zone_price_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
        price_group text NOT NULL,
        price_phase text NOT NULL,
        price integer NOT NULL,
        currency text NOT NULL DEFAULT 'IDR',
        starts_at timestamp,
        ends_at timestamp,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS zone_price_rules_zone_id_price_group_price_phase_unique ON "${schemaName}".zone_price_rules (zone_id, price_group, price_phase)`
    );

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS booth_facility_catalog (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        description text,
        sort_order integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS booth_facility_catalog_name_unique ON "${schemaName}".booth_facility_catalog (name)`
    );

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS booth_facilities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        booth_id uuid NOT NULL REFERENCES booths(id) ON DELETE CASCADE,
        facility_id uuid NOT NULL REFERENCES booth_facility_catalog(id) ON DELETE CASCADE,
        value text,
        notes text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS booth_facilities_booth_id_facility_id_unique ON "${schemaName}".booth_facilities (booth_id, facility_id)`
    );

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS booth_bookings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        booth_id uuid NOT NULL REFERENCES booths(id) ON DELETE CASCADE,
        participant_id uuid NOT NULL,
        business_id uuid NOT NULL,
        booking_status text NOT NULL DEFAULT 'booked',
        price_category text NOT NULL,
        base_price integer NOT NULL,
        final_price integer NOT NULL,
        invoice_id text,
        notes text,
        booked_at timestamp DEFAULT now(),
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS event_addons (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        description text,
        price integer NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS addon_units (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text NOT NULL,
        name text NOT NULL,
        description text,
        sort_order integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS addon_units_slug_unique ON "${schemaName}".addon_units (slug)`
    );
    await sql.unsafe(`
      ALTER TABLE "${schemaName}".event_addons
      ADD COLUMN IF NOT EXISTS addon_unit_id uuid REFERENCES "${schemaName}".addon_units(id) ON DELETE RESTRICT
    `);
    await sql.unsafe(`
      ALTER TABLE "${schemaName}".event_addons
      ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0
    `);
    await sql.unsafe(`
      ALTER TABLE "${schemaName}".event_addons
      ADD COLUMN IF NOT EXISTS vendor_price integer
    `);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS registrations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        participant_id uuid NOT NULL,
        business_id uuid NOT NULL,
        booth_booking_id uuid REFERENCES booth_bookings(id) ON DELETE SET NULL,
        fascia_name text,
        business_description text,
        status text NOT NULL DEFAULT 'draft',
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS registration_addons (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
        addon_id uuid NOT NULL REFERENCES event_addons(id) ON DELETE CASCADE,
        quantity integer NOT NULL DEFAULT 1,
        price_snapshot integer NOT NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
        scheme text NOT NULL,
        method text,
        subtotal integer NOT NULL,
        ppn_amount integer NOT NULL DEFAULT 0,
        total integer NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        participant_id uuid NOT NULL,
        business_id uuid NOT NULL,
        status text NOT NULL DEFAULT 'draft',
        notes text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS order_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        item_type text NOT NULL,
        reference_id text,
        title text NOT NULL,
        description text,
        quantity integer NOT NULL DEFAULT 1,
        unit_price integer NOT NULL,
        subtotal integer NOT NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS invoices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
        participant_id uuid,
        business_id uuid,
        recipient_name text,
        recipient_email text,
        public_token uuid NOT NULL DEFAULT gen_random_uuid(),
        invoice_number text NOT NULL,
        issue_date timestamp NOT NULL DEFAULT now(),
        due_date timestamp,
        subtotal integer NOT NULL,
        tax_amount integer NOT NULL DEFAULT 0,
        grand_total integer NOT NULL,
        payment_channel_id text,
        payment_channel_type text,
        payment_channel_label text,
        proof_of_transfer_url text,
        status text NOT NULL DEFAULT 'waiting_for_payment',
        paid_at timestamp,
        notes text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS invoices_invoice_number_unique ON "${schemaName}".invoices (invoice_number)`
    );
    
    // Migrasi kolom baru untuk schema yang sudah ada
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ALTER COLUMN order_id DROP NOT NULL`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS participant_id uuid`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS business_id uuid`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS recipient_name text`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS recipient_email text`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS public_token uuid DEFAULT gen_random_uuid()`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS proof_of_transfer_url text`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS overpayment_amount integer DEFAULT 0`);

    // DP / Installment columns
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'full'`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS dp_minimum_percent integer NOT NULL DEFAULT 50`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS dp_amount integer NOT NULL DEFAULT 0`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS dp_paid_at timestamp`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS balance_due_date timestamp`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS reservation_extended_until timestamp`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS extended_by_user_id text`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS extended_by_name text`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS extended_at timestamp`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS extension_notes text`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS cancelled_by_user_id text`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS cancelled_by_name text`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS cancelled_at timestamp`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS cancellation_reason text`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS refund_amount integer DEFAULT 0`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS next_reminder_at timestamp`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamp`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoices ADD COLUMN IF NOT EXISTS cs_notified_h1 boolean DEFAULT false`);

    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS invoices_public_token_unique ON "${schemaName}".invoices (public_token)`
    );

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        item_type text NOT NULL,
        reference_id text,
        title text NOT NULL,
        description text,
        quantity integer NOT NULL DEFAULT 1,
        unit_price integer NOT NULL,
        subtotal integer NOT NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS invoice_payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        payment_channel_id text,
        payment_channel_type text,
        payment_channel_label text,
        amount integer NOT NULL,
        paid_at timestamp NOT NULL DEFAULT now(),
        status text NOT NULL DEFAULT 'verified',
        method text,
        reference_number text,
        notes text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoice_payments ADD COLUMN IF NOT EXISTS sender_name text`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoice_payments ADD COLUMN IF NOT EXISTS proof_asset_id uuid`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoice_payments DROP COLUMN IF EXISTS proof_url`);
    await sql.unsafe(`ALTER TABLE "${schemaName}".invoice_payments ADD COLUMN IF NOT EXISTS payment_sequence text NOT NULL DEFAULT 'full'`);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS cashflow_ledger (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_date timestamp NOT NULL DEFAULT now(),
        type text NOT NULL,
        category text NOT NULL,
        amount integer NOT NULL,
        description text NOT NULL,
        reference_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);

    // Disbursement (Pencairan Dana)
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".disbursement_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        requested_by uuid NOT NULL,
        requested_by_name text NOT NULL,
        purpose_type text NOT NULL,
        purpose_description text NOT NULL,
        vendor_id uuid,
        vendor_addon_ref text,
        requested_amount integer NOT NULL,
        dest_bank_name text NOT NULL,
        dest_account_number text NOT NULL,
        dest_account_name text NOT NULL,
        status text NOT NULL DEFAULT 'draft',
        approved_by uuid,
        approved_by_name text,
        approved_at timestamp,
        rejected_by uuid,
        rejected_by_name text,
        rejected_at timestamp,
        rejection_reason text,
        notes text,
        event_id uuid NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".disbursement_transfers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id uuid NOT NULL REFERENCES "${schemaName}".disbursement_requests(id) ON DELETE CASCADE,
        transferred_at timestamp NOT NULL,
        source_channel_id text,
        source_channel_label text,
        dest_bank_name text NOT NULL,
        dest_account_number text NOT NULL,
        dest_account_name text NOT NULL,
        gross_amount integer NOT NULL,
        transfer_fee integer NOT NULL DEFAULT 0,
        net_amount integer NOT NULL,
        proof_asset_url text,
        transferred_by uuid NOT NULL,
        transferred_by_name text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await sql.unsafe(`
      ALTER TABLE "${schemaName}".cashflow_ledger
      ADD COLUMN IF NOT EXISTS reference_disbursement_id uuid
    `);

    // ── WhatsApp Rotator ────────────────────────────────────────────────────────
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".wa_rotator_agents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL,
        name text NOT NULL,
        greeting_name text NOT NULL,
        wa_number text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,
        total_clicks integer NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".wa_rotator_clicks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id uuid NOT NULL REFERENCES "${schemaName}".wa_rotator_agents(id) ON DELETE CASCADE,
        event_id uuid NOT NULL,
        source text NOT NULL DEFAULT 'public_bottom_nav',
        clicked_at timestamp NOT NULL DEFAULT now()
      )
    `);

    console.log(`Tenant schema ready: ${schemaName}`);
  } finally {
    await sql.end();
  }
}

provisionTenantSchema()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Provision tenant gagal:', error);
    process.exit(1);
  });
