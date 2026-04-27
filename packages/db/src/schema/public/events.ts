import { relations } from 'drizzle-orm';
import { eventPages } from './pages';
import { eventNavMenus } from './menus';
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const expoEvents = pgTable('expo_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  schemaName: text('schema_name').unique().notNull(), // cth: 'expo_forbis2026'
  logoAssetId: uuid('logo_asset_id'),
  homepagePageId: uuid('homepage_page_id'),
  venue: text('venue'),
  targetBooths: integer('target_booths'),
  targetVisitors: integer('target_visitors'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  financeWaNumbers: text('finance_wa_numbers').array().default([]),
  leaderWaNumbers: text('leader_wa_numbers').array().default([]),
  eventTeamWaNumbers: text('event_team_wa_numbers').array().default([]),
  invoiceDueDays: integer('invoice_due_days').default(1).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const paymentChannels = pgTable('payment_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => expoEvents.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  label: text('label').notNull(),
  accountName: text('account_name'),
  accountNumber: text('account_number'),
  bankName: text('bank_name'),
  qrisImageAssetId: uuid('qris_image_asset_id'),
  provider: text('provider'),
  instruction: text('instruction'),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const qrisConfigs = pgTable(
  'qris_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => expoEvents.id, { onDelete: 'cascade' }),
    isEnabled: boolean('is_enabled').default(false).notNull(),
    emvPayload: text('emv_payload'),
    merchantName: text('merchant_name'),
    merchantCity: text('merchant_city'),
    imageAssetId: uuid('image_asset_id'),
    expiryMinutes: integer('expiry_minutes').default(15),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    eventUnique: uniqueIndex('qris_configs_event_id_unique').on(table.eventId),
  })
);

export const whatsappConfigs = pgTable(
  'whatsapp_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => expoEvents.id, { onDelete: 'cascade' }),
    apiBaseUrl: text('api_base_url'),
    username: text('username'),
    password: text('password'),
    deviceId: text('device_id'),
    senderNumber: text('sender_number'),
    webhookSecret: text('webhook_secret'),
    sendDelayMs: integer('send_delay_ms').default(2000),
    isActive: boolean('is_active').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    eventUnique: uniqueIndex('whatsapp_configs_event_id_unique').on(table.eventId),
  })
);

export const messageTemplates = pgTable(
  'message_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => expoEvents.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    bodyTemplate: text('body_template').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    eventKeyUnique: uniqueIndex('message_templates_event_id_key_unique').on(
      table.eventId,
      table.key
    ),
  })
);

export const eventAgendas = pgTable(
  'event_agendas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => expoEvents.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    agendaType: text('agenda_type').notNull().default('session'),
    startAt: timestamp('start_at').notNull(),
    endAt: timestamp('end_at'),
    venueName: text('venue_name'),
    stageName: text('stage_name'),
    speakerNames: text('speaker_names').array(),
    isPublic: boolean('is_public').notNull().default(true),
    status: text('status').notNull().default('draft'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    eventSlugUnique: uniqueIndex('event_agendas_event_id_slug_unique').on(
      table.eventId,
      table.slug
    ),
  })
);

export const expoEventRelations = relations(expoEvents, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [expoEvents.organizationId],
    references: [organizations.id],
  }),
  agendas: many(eventAgendas),
  paymentChannels: many(paymentChannels),
  qrisConfigs: many(qrisConfigs),
  whatsappConfigs: many(whatsappConfigs),
  messageTemplates: many(messageTemplates),
  pages: many(eventPages),
  navMenus: many(eventNavMenus),
  homepage: one(eventPages, {
    fields: [expoEvents.homepagePageId],
    references: [eventPages.id],
  }),
}));

export const paymentChannelRelations = relations(paymentChannels, ({ one }) => ({
  event: one(expoEvents, {
    fields: [paymentChannels.eventId],
    references: [expoEvents.id],
  }),
}));

export const qrisConfigRelations = relations(qrisConfigs, ({ one }) => ({
  event: one(expoEvents, {
    fields: [qrisConfigs.eventId],
    references: [expoEvents.id],
  }),
}));

export const whatsappConfigRelations = relations(whatsappConfigs, ({ one }) => ({
  event: one(expoEvents, {
    fields: [whatsappConfigs.eventId],
    references: [expoEvents.id],
  }),
}));

export const messageTemplateRelations = relations(messageTemplates, ({ one }) => ({
  event: one(expoEvents, {
    fields: [messageTemplates.eventId],
    references: [expoEvents.id],
  }),
}));

export const eventAgendaRelations = relations(eventAgendas, ({ one }) => ({
  event: one(expoEvents, {
    fields: [eventAgendas.eventId],
    references: [expoEvents.id],
  }),
}));
