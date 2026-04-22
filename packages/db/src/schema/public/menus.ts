import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { expoEvents } from './events';
import { eventPages } from './pages';

export const eventNavMenus = pgTable('event_nav_menus', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => expoEvents.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  sourceType: text('source_type').notNull(), // 'page' | 'system' | 'external'
  pageId: uuid('page_id').references(() => eventPages.id, { onDelete: 'cascade' }),
  systemKey: text('system_key'),
  externalUrl: text('external_url'),
  openInNewTab: boolean('open_in_new_tab').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const eventNavMenusRelations = relations(eventNavMenus, ({ one }) => ({
  event: one(expoEvents, {
    fields: [eventNavMenus.eventId],
    references: [expoEvents.id],
  }),
  page: one(eventPages, {
    fields: [eventNavMenus.pageId],
    references: [eventPages.id],
  }),
}));
