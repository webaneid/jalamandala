import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { expoEvents } from './events';
import { mediaAssets } from './media';
import { jsonb } from 'drizzle-orm/pg-core';

export const eventPages = pgTable('event_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => expoEvents.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  pageType: text('page_type').notNull().default('default'),
  status: text('status').notNull().default('draft'),
  excerpt: text('excerpt'),
  contentFormat: text('content_format').notNull().default('tiptap_json'),
  content: jsonb('content'),
  featuredImageAssetId: uuid('featured_image_asset_id')
    .references(() => mediaAssets.id, { onDelete: 'set null' }),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const eventPageRelations = relations(eventPages, ({ one }) => ({
  event: one(expoEvents, {
    fields: [eventPages.eventId],
    references: [expoEvents.id],
  }),
  featuredImage: one(mediaAssets, {
    fields: [eventPages.featuredImageAssetId],
    references: [mediaAssets.id],
  }),
}));
