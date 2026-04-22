import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const zones = pgTable(
  'zones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    location: text('location'),
    imageAssetId: uuid('image_asset_id'),
    colorCode: text('color_code'),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('zones_slug_unique').on(table.slug),
  })
);

export const boothGroups = pgTable(
  'booth_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    defaultPriceGroup: text('default_price_group'),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('booth_groups_slug_unique').on(table.slug),
  })
);

export const boothCategories = pgTable(
  'booth_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('booth_categories_slug_unique').on(table.slug),
  })
);

export const booths = pgTable(
  'booths',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    zoneId: uuid('zone_id')
      .notNull()
      .references(() => zones.id, { onDelete: 'cascade' }),
    boothGroupId: uuid('booth_group_id')
      .notNull()
      .references(() => boothGroups.id, { onDelete: 'restrict' }),
    boothCategoryId: uuid('booth_category_id')
      .notNull()
      .references(() => boothCategories.id, { onDelete: 'restrict' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status').default('open').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    x: integer('x'),
    y: integer('y'),
    width: integer('width'),
    height: integer('height'),
    rotation: integer('rotation').default(0).notNull(),
    shape: text('shape').default('rect').notNull(),
    notes: text('notes'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    codeUnique: uniqueIndex('booths_code_unique').on(table.code),
  })
);

export const zonePriceRules = pgTable(
  'zone_price_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    zoneId: uuid('zone_id')
      .notNull()
      .references(() => zones.id, { onDelete: 'cascade' }),
    priceGroup: text('price_group').notNull(),
    pricePhase: text('price_phase').notNull(),
    price: integer('price').notNull(),
    currency: text('currency').default('IDR').notNull(),
    startsAt: timestamp('starts_at'),
    endsAt: timestamp('ends_at'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    zoneGroupPhaseUnique: uniqueIndex(
      'zone_price_rules_zone_id_price_group_price_phase_unique'
    ).on(table.zoneId, table.priceGroup, table.pricePhase),
  })
);

export const boothFacilityCatalog = pgTable(
  'booth_facility_catalog',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    nameUnique: uniqueIndex('booth_facility_catalog_name_unique').on(table.name),
  })
);

export const boothFacilities = pgTable(
  'booth_facilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    boothId: uuid('booth_id')
      .notNull()
      .references(() => booths.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => boothFacilityCatalog.id, { onDelete: 'cascade' }),
    value: text('value'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    boothFacilityUnique: uniqueIndex('booth_facilities_booth_id_facility_id_unique').on(
      table.boothId,
      table.facilityId
    ),
  })
);

export const boothBookings = pgTable('booth_bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  boothId: uuid('booth_id')
    .notNull()
    .references(() => booths.id, { onDelete: 'cascade' }),
  participantId: uuid('participant_id').notNull(),
  businessId: uuid('business_id').notNull(),
  bookingStatus: text('booking_status').default('booked').notNull(),
  priceCategory: text('price_category').notNull(),
  basePrice: integer('base_price').notNull(),
  finalPrice: integer('final_price').notNull(),
  invoiceId: text('invoice_id'),
  notes: text('notes'),
  bookedAt: timestamp('booked_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const addonUnits = pgTable(
  'addon_units',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('addon_units_slug_unique').on(table.slug),
  })
);

export const eventAddons = pgTable('event_addons', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  addonUnitId: uuid('addon_unit_id').references(() => addonUnits.id, {
    onDelete: 'restrict',
  }),
  price: integer('price').notNull(),
  vendorPrice: integer('vendor_price'),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const zoneRelations = relations(zones, ({ many }) => ({
  booths: many(booths),
  priceRules: many(zonePriceRules),
}));

export const boothGroupRelations = relations(boothGroups, ({ many }) => ({
  booths: many(booths),
}));

export const boothCategoryRelations = relations(boothCategories, ({ many }) => ({
  booths: many(booths),
}));

export const boothRelations = relations(booths, ({ one, many }) => ({
  zone: one(zones, {
    fields: [booths.zoneId],
    references: [zones.id],
  }),
  boothGroup: one(boothGroups, {
    fields: [booths.boothGroupId],
    references: [boothGroups.id],
  }),
  boothCategory: one(boothCategories, {
    fields: [booths.boothCategoryId],
    references: [boothCategories.id],
  }),
  facilities: many(boothFacilities),
  bookings: many(boothBookings),
}));

export const zonePriceRuleRelations = relations(zonePriceRules, ({ one }) => ({
  zone: one(zones, {
    fields: [zonePriceRules.zoneId],
    references: [zones.id],
  }),
}));

export const boothFacilityCatalogRelations = relations(
  boothFacilityCatalog,
  ({ many }) => ({
    boothFacilities: many(boothFacilities),
  })
);

export const boothFacilitiesRelations = relations(boothFacilities, ({ one }) => ({
  booth: one(booths, {
    fields: [boothFacilities.boothId],
    references: [booths.id],
  }),
  facility: one(boothFacilityCatalog, {
    fields: [boothFacilities.facilityId],
    references: [boothFacilityCatalog.id],
  }),
}));

export const boothBookingRelations = relations(boothBookings, ({ one }) => ({
  booth: one(booths, {
    fields: [boothBookings.boothId],
    references: [booths.id],
  }),
}));

export const addonUnitRelations = relations(addonUnits, ({ many }) => ({
  addons: many(eventAddons),
}));

export const eventAddonRelations = relations(eventAddons, ({ one }) => ({
  addonUnit: one(addonUnits, {
    fields: [eventAddons.addonUnitId],
    references: [addonUnits.id],
  }),
}));
