import * as dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '../../.env' });

async function provisionPublicSchema() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    console.log('Provisioning public event setting tables...');

    await sql.unsafe(`
      ALTER TABLE public.expo_events
      ADD COLUMN IF NOT EXISTS logo_url text
    `);
    await sql.unsafe(`
      ALTER TABLE public.expo_events
      ADD COLUMN IF NOT EXISTS venue text
    `);
    await sql.unsafe(`
      ALTER TABLE public.expo_events
      ADD COLUMN IF NOT EXISTS target_booths integer
    `);
    await sql.unsafe(`
      ALTER TABLE public.expo_events
      ADD COLUMN IF NOT EXISTS target_visitors integer
    `);
    await sql.unsafe(`
      ALTER TABLE public.expo_events
      ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()
    `);
    await sql.unsafe(`
      ALTER TABLE public.expo_events
      ADD COLUMN IF NOT EXISTS invoice_due_days integer NOT NULL DEFAULT 1
    `);
    await sql.unsafe(`
      ALTER TABLE public.expo_events
      ADD COLUMN IF NOT EXISTS registration_wa_numbers text[] DEFAULT '{}'
    `);

    await sql.unsafe(`
      ALTER TABLE public.participants
      ADD COLUMN IF NOT EXISTS email text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participants
      ADD COLUMN IF NOT EXISTS organization_group_id uuid
    `);
    await sql.unsafe(`
      ALTER TABLE public.participants
      ADD COLUMN IF NOT EXISTS organization_group_slug text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participants
      ADD COLUMN IF NOT EXISTS organization_group_name text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participants
      ADD COLUMN IF NOT EXISTS password_hash text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participants
      ADD COLUMN IF NOT EXISTS whatsapp_verified_at timestamp
    `);
    await sql.unsafe(`
      ALTER TABLE public.participants
      ADD COLUMN IF NOT EXISTS password_updated_at timestamp
    `);

    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS booth_name text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS requested_booth_category_id uuid
    `);
    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS requested_booth_category_slug text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS requested_booth_category_name text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS company_description text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS company_phone text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS company_whatsapp text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS company_address text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS company_province_code text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS company_province_name text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS company_regency_code text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS company_regency_name text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS company_district_code text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS company_district_name text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS company_village_code text
    `);
    await sql.unsafe(`
      ALTER TABLE public.participant_businesses
      ADD COLUMN IF NOT EXISTS company_village_name text
    `);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.indonesia_regions (
        code text PRIMARY KEY,
        name text NOT NULL,
        level text NOT NULL,
        parent_code text,
        source text NOT NULL DEFAULT 'cahyadsn/wilayah',
        source_updated_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS indonesia_regions_level_parent_idx ON public.indonesia_regions (level, parent_code)`
    );
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS indonesia_regions_name_idx ON public.indonesia_regions (name)`
    );

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.forbis_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        forbis_member_id text,
        name text NOT NULL,
        phone text,
        whatsapp text,
        is_kmi_alumni boolean DEFAULT false,
        kmi_year text,
        company_name text,
        booth_name text,
        requested_booth_category_slug text,
        company_description text,
        company_phone text,
        company_whatsapp text,
        company_address text,
        company_province_code text,
        company_province_name text,
        company_regency_code text,
        company_regency_name text,
        company_district_code text,
        company_district_name text,
        company_village_code text,
        company_village_name text,
        legal_entity text,
        business_category text,
        business_sector text,
        brand_name text,
        product_tags text[],
        partnership_concepts text[],
        import_key text,
        import_batch_id text,
        source_file_name text,
        raw_payload jsonb,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS email text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS forbis_member_id text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS phone text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS whatsapp text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS is_kmi_alumni boolean DEFAULT false`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS kmi_year text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS company_name text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS booth_name text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS requested_booth_category_slug text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS company_description text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS company_phone text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS company_whatsapp text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS company_address text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS company_province_code text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS company_province_name text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS company_regency_code text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS company_regency_name text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS company_district_code text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS company_district_name text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS company_village_code text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS company_village_name text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS legal_entity text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS business_category text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS business_sector text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS brand_name text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS product_tags text[]`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS partnership_concepts text[]`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS import_key text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS import_batch_id text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS source_file_name text`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS raw_payload jsonb`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now()`);
    await sql.unsafe(`ALTER TABLE public.forbis_members ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()`);
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS forbis_members_search_idx ON public.forbis_members (name, forbis_member_id)`
    );
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS forbis_members_active_idx ON public.forbis_members (is_active)`
    );
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS forbis_members_import_key_unique ON public.forbis_members (import_key)`
    );

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.payment_channels (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL REFERENCES public.expo_events(id) ON DELETE CASCADE,
        type text NOT NULL,
        label text NOT NULL,
        account_name text,
        account_number text,
        bank_name text,
        qris_image_url text,
        provider text,
        instruction text,
        is_active boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.qris_configs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL REFERENCES public.expo_events(id) ON DELETE CASCADE,
        is_enabled boolean NOT NULL DEFAULT false,
        emv_payload text,
        merchant_name text,
        merchant_city text,
        image_url text,
        expiry_minutes integer DEFAULT 15,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS qris_configs_event_id_unique ON public.qris_configs (event_id)`
    );

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.whatsapp_configs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL REFERENCES public.expo_events(id) ON DELETE CASCADE,
        api_base_url text,
        username text,
        password text,
        device_id text,
        sender_number text,
        webhook_secret text,
        send_delay_ms integer DEFAULT 2000,
        is_active boolean NOT NULL DEFAULT false,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(`ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS username text`);
    await sql.unsafe(`ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS password text`);
    await sql.unsafe(`ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS device_id text`);
    await sql.unsafe(`ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS sender_number text`);
    await sql.unsafe(`ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS webhook_secret text`);
    await sql.unsafe(`ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS send_delay_ms integer DEFAULT 2000`);
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_configs_event_id_unique ON public.whatsapp_configs (event_id)`
    );

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.message_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL REFERENCES public.expo_events(id) ON DELETE CASCADE,
        key text NOT NULL,
        title text NOT NULL,
        body_template text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS message_templates_event_id_key_unique ON public.message_templates (event_id, key)`
    );

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.event_agendas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL REFERENCES public.expo_events(id) ON DELETE CASCADE,
        title text NOT NULL,
        slug text NOT NULL,
        description text,
        agenda_type text NOT NULL DEFAULT 'session',
        start_at timestamp NOT NULL,
        end_at timestamp,
        venue_name text,
        stage_name text,
        speaker_names text[],
        is_public boolean NOT NULL DEFAULT true,
        status text NOT NULL DEFAULT 'draft',
        sort_order integer NOT NULL DEFAULT 0,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS event_agendas_event_id_slug_unique ON public.event_agendas (event_id, slug)`
    );
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS event_agendas_event_id_start_at_idx ON public.event_agendas (event_id, start_at)`
    );
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS event_agendas_status_idx ON public.event_agendas (status)`
    );

    await sql.unsafe(`
      DO $$ BEGIN
        CREATE TYPE public.user_role AS ENUM (
          'super_admin', 'admin', 'finance', 'event_crew', 'vendor', 'participant'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
        role public.user_role NOT NULL,
        event_id uuid,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles (user_id)`
    );
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS user_roles_role_idx ON public.user_roles (role)`
    );

    // Media Library
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.media_assets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_schema text,
        event_id uuid,
        owner_user_id uuid,
        owner_participant_id uuid,
        owner_business_id uuid,
        bucket text NOT NULL,
        object_key text NOT NULL,
        public_url text,
        file_name text NOT NULL,
        original_name text NOT NULL,
        mime_type text NOT NULL,
        extension text NOT NULL,
        size_bytes integer NOT NULL,
        width integer,
        height integer,
        checksum text,
        title text,
        alt_text text,
        description text,
        asset_type text NOT NULL,
        visibility text NOT NULL DEFAULT 'private',
        status text NOT NULL DEFAULT 'active',
        is_locked boolean NOT NULL DEFAULT false,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now(),
        deleted_at timestamp
      )
    `);
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS media_assets_object_key_unique ON public.media_assets (object_key)`
    );
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS media_assets_owner_participant_idx ON public.media_assets (owner_participant_id)`
    );
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS media_assets_owner_business_idx ON public.media_assets (owner_business_id)`
    );
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS media_assets_event_id_idx ON public.media_assets (event_id)`
    );
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS media_assets_status_idx ON public.media_assets (status)`
    );

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.media_usages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
        module text NOT NULL,
        entity_type text NOT NULL,
        entity_id text NOT NULL,
        field_name text NOT NULL,
        created_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS media_usages_asset_id_idx ON public.media_usages (asset_id)`
    );
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS media_usages_entity_idx ON public.media_usages (entity_type, entity_id)`
    );

    // Asset ID columns on existing tables (backward compatible)
    await sql.unsafe(`ALTER TABLE public.participant_businesses ADD COLUMN IF NOT EXISTS logo_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL`);
    await sql.unsafe(`ALTER TABLE public.participant_businesses ADD COLUMN IF NOT EXISTS team_male_count integer`);
    await sql.unsafe(`ALTER TABLE public.participant_businesses ADD COLUMN IF NOT EXISTS team_female_count integer`);
    await sql.unsafe(`ALTER TABLE public.expo_events ADD COLUMN IF NOT EXISTS logo_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL`);
    await sql.unsafe(`ALTER TABLE public.payment_channels ADD COLUMN IF NOT EXISTS qris_image_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL`);
    await sql.unsafe(`ALTER TABLE public.qris_configs ADD COLUMN IF NOT EXISTS image_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL`);
    await sql.unsafe(`ALTER TABLE public.event_agendas ADD COLUMN IF NOT EXISTS description text`);
    await sql.unsafe(`ALTER TABLE public.event_agendas ADD COLUMN IF NOT EXISTS agenda_type text NOT NULL DEFAULT 'session'`);
    await sql.unsafe(`ALTER TABLE public.event_agendas ADD COLUMN IF NOT EXISTS end_at timestamp`);
    await sql.unsafe(`ALTER TABLE public.event_agendas ADD COLUMN IF NOT EXISTS venue_name text`);
    await sql.unsafe(`ALTER TABLE public.event_agendas ADD COLUMN IF NOT EXISTS stage_name text`);
    await sql.unsafe(`ALTER TABLE public.event_agendas ADD COLUMN IF NOT EXISTS speaker_names text[]`);
    await sql.unsafe(`ALTER TABLE public.event_agendas ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true`);
    await sql.unsafe(`ALTER TABLE public.event_agendas ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'`);
    await sql.unsafe(`ALTER TABLE public.event_agendas ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0`);
    await sql.unsafe(`ALTER TABLE public.event_agendas ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now()`);
    await sql.unsafe(`ALTER TABLE public.event_agendas ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()`);

    // Drop legacy _url columns after media_assets migration
    await sql.unsafe(`ALTER TABLE public.participant_businesses DROP COLUMN IF EXISTS logo_url`);
    await sql.unsafe(`ALTER TABLE public.expo_events DROP COLUMN IF EXISTS logo_url`);
    await sql.unsafe(`ALTER TABLE public.payment_channels DROP COLUMN IF EXISTS qris_image_url`);
    await sql.unsafe(`ALTER TABLE public.qris_configs DROP COLUMN IF EXISTS image_url`);

    // Vendors
    await sql.unsafe(`
      DO $$ BEGIN
        CREATE TYPE public.vendor_type AS ENUM ('booth', 'addon');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.vendors (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
        event_id uuid NOT NULL,
        name text NOT NULL,
        whatsapp text NOT NULL,
        vendor_type public.vendor_type NOT NULL,
        notes text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        UNIQUE (user_id, event_id)
      )
    `);
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS vendors_event_id_idx ON public.vendors (event_id)`
    );
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS vendors_user_id_idx ON public.vendors (user_id)`
    );
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.vendor_booth_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
        zone_slug text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS vendor_booth_assignments_vendor_id_idx ON public.vendor_booth_assignments (vendor_id)`
    );
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.vendor_addon_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
        event_addon_id uuid NOT NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await sql.unsafe(
      `CREATE INDEX IF NOT EXISTS vendor_addon_assignments_vendor_id_idx ON public.vendor_addon_assignments (vendor_id)`
    );

    // Event Pages
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.event_pages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL REFERENCES public.expo_events(id) ON DELETE CASCADE,
        title text NOT NULL,
        slug text NOT NULL,
        page_type text NOT NULL DEFAULT 'default',
        status text NOT NULL DEFAULT 'draft',
        excerpt text,
        content_format text NOT NULL DEFAULT 'tiptap_json',
        content jsonb,
        featured_image_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
        seo_title text,
        seo_description text,
        published_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now(),
        deleted_at timestamp
      )
    `);
    await sql.unsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS event_pages_event_id_slug_unique ON public.event_pages (event_id, slug)`
    );


    // Vendor bank account fields
    await sql.unsafe(`ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_name text`);
    await sql.unsafe(`ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_account text`);
    await sql.unsafe(`
      ALTER TABLE public.vendors
      ADD COLUMN IF NOT EXISTS bank_account_name text
    `);

    // Front-End Menu & Homepage settings
    await sql.unsafe(`
      ALTER TABLE public.expo_events
      ADD COLUMN IF NOT EXISTS homepage_page_id uuid
    `);

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.event_nav_menus (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL REFERENCES public.expo_events(id) ON DELETE CASCADE,
        label text NOT NULL,
        source_type text NOT NULL,
        page_id uuid REFERENCES public.event_pages(id) ON DELETE CASCADE,
        system_key text,
        external_url text,
        open_in_new_tab boolean NOT NULL DEFAULT false,
        sort_order integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);

    await sql.unsafe(`ALTER TABLE public.expo_events ADD COLUMN IF NOT EXISTS finance_wa_numbers text[] DEFAULT '{}'`);
    await sql.unsafe(`ALTER TABLE public.expo_events ADD COLUMN IF NOT EXISTS leader_wa_numbers text[] DEFAULT '{}'`);
    await sql.unsafe(`ALTER TABLE public.expo_events ADD COLUMN IF NOT EXISTS event_team_wa_numbers text[] DEFAULT '{}'`);

    // Participant Terms Approvals
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.participant_terms_approvals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL REFERENCES public.expo_events(id) ON DELETE CASCADE,
        participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
        terms_page_id uuid NOT NULL REFERENCES public.event_pages(id) ON DELETE RESTRICT,
        terms_page_slug text NOT NULL,
        terms_page_title text NOT NULL,
        terms_content_checksum text NOT NULL,
        terms_content_format text NOT NULL DEFAULT 'tiptap_json',
        approved_at timestamptz NOT NULL DEFAULT now(),
        approved_at_wib timestamp NOT NULL,
        approved_timezone text NOT NULL DEFAULT 'Asia/Jakarta',
        ip_address text,
        user_agent text,
        approval_source text NOT NULL DEFAULT 'public_web',
        approval_token text NOT NULL,
        qr_payload jsonb,
        is_active boolean NOT NULL DEFAULT true,
        superseded_by_id uuid,
        created_at timestamp DEFAULT now()
      )
    `);
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS participant_terms_approvals_participant_event_idx
      ON public.participant_terms_approvals (participant_id, event_id, is_active)
    `);

    console.log('Public event setting tables ready.');
  } finally {
    await sql.end();
  }
}

provisionPublicSchema().catch((error) => {
  console.error('Provision public schema failed:', error);
  process.exit(1);
});
