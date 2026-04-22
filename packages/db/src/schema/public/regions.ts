import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const indonesiaRegions = pgTable('indonesia_regions', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  level: text('level').notNull(),
  parentCode: text('parent_code'),
  source: text('source').default('cahyadsn/wilayah').notNull(),
  sourceUpdatedAt: timestamp('source_updated_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
