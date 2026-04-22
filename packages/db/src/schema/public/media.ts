import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Konteks kepemilikan
  tenantSchema: text('tenant_schema'),
  eventId: uuid('event_id'),
  ownerUserId: uuid('owner_user_id'),
  ownerParticipantId: uuid('owner_participant_id'),
  ownerBusinessId: uuid('owner_business_id'),

  // Storage
  bucket: text('bucket').notNull(),
  objectKey: text('object_key').notNull().unique(),
  publicUrl: text('public_url'),

  // Metadata file
  fileName: text('file_name').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  extension: text('extension').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  checksum: text('checksum'),

  // Konten semantik
  title: text('title'),
  altText: text('alt_text'),
  description: text('description'),

  // Klasifikasi
  assetType: text('asset_type').notNull(), // 'image' | 'document' | 'pdf' | 'other'
  visibility: text('visibility').notNull().default('private'), // 'public' | 'private' | 'event_admin'
  status: text('status').notNull().default('active'), // 'active' | 'archived' | 'deleted'
  isLocked: boolean('is_locked').notNull().default(false),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const mediaUsages = pgTable('media_usages', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id')
    .notNull()
    .references(() => mediaAssets.id, { onDelete: 'cascade' }),
  module: text('module').notNull(),      // 'participant' | 'event' | 'finance' | 'qris'
  entityType: text('entity_type').notNull(), // 'participant_business' | 'expo_event' | 'invoice_payment'
  entityId: text('entity_id').notNull(),
  fieldName: text('field_name').notNull(), // 'logo' | 'proof' | 'qris_image'
  createdAt: timestamp('created_at').defaultNow(),
});

export const mediaAssetRelations = relations(mediaAssets, ({ many }) => ({
  usages: many(mediaUsages),
}));

export const mediaUsageRelations = relations(mediaUsages, ({ one }) => ({
  asset: one(mediaAssets, {
    fields: [mediaUsages.assetId],
    references: [mediaAssets.id],
  }),
}));
