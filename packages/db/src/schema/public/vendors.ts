import { boolean, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './users';

export const vendorTypeEnum = pgEnum('vendor_type', ['booth', 'addon']);

export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').notNull(),
  name: text('name').notNull(),
  whatsapp: text('whatsapp').notNull(),
  vendorType: vendorTypeEnum('vendor_type').notNull(),
  notes: text('notes'),
  bankName: text('bank_name'),
  bankAccount: text('bank_account'),
  bankAccountName: text('bank_account_name'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userEventUnique: unique('vendors_user_event_unique').on(table.userId, table.eventId),
}));

export const vendorBoothAssignments = pgTable('vendor_booth_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  zoneSlug: text('zone_slug').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const vendorAddonAssignments = pgTable('vendor_addon_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  eventAddonId: uuid('event_addon_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const vendorRelations = relations(vendors, ({ one, many }) => ({
  user: one(user, { fields: [vendors.userId], references: [user.id] }),
  boothAssignments: many(vendorBoothAssignments),
  addonAssignments: many(vendorAddonAssignments),
}));

export const vendorBoothAssignmentRelations = relations(vendorBoothAssignments, ({ one }) => ({
  vendor: one(vendors, { fields: [vendorBoothAssignments.vendorId], references: [vendors.id] }),
}));

export const vendorAddonAssignmentRelations = relations(vendorAddonAssignments, ({ one }) => ({
  vendor: one(vendors, { fields: [vendorAddonAssignments.vendorId], references: [vendors.id] }),
}));
