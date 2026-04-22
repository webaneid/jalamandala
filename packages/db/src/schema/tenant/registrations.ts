import { relations } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { boothBookings, eventAddons } from './booths';

export const registrations = pgTable('registrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  participantId: uuid('participant_id').notNull(),
  businessId: uuid('business_id').notNull(),
  boothBookingId: uuid('booth_booking_id').references(() => boothBookings.id, {
    onDelete: 'set null',
  }),
  fasciaName: text('fascia_name'),
  businessDescription: text('business_description'),
  status: text('status').default('draft').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const registrationAddons = pgTable('registration_addons', {
  id: uuid('id').primaryKey().defaultRandom(),
  registrationId: uuid('registration_id')
    .notNull()
    .references(() => registrations.id, { onDelete: 'cascade' }),
  addonId: uuid('addon_id')
    .notNull()
    .references(() => eventAddons.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').default(1).notNull(),
  priceSnapshot: integer('price_snapshot').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  registrationId: uuid('registration_id')
    .notNull()
    .references(() => registrations.id, { onDelete: 'cascade' }),
  scheme: text('scheme').notNull(),
  method: text('method'),
  subtotal: integer('subtotal').notNull(),
  ppnAmount: integer('ppn_amount').default(0).notNull(),
  total: integer('total').notNull(),
  status: text('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const registrationRelations = relations(registrations, ({ one, many }) => ({
  boothBooking: one(boothBookings, {
    fields: [registrations.boothBookingId],
    references: [boothBookings.id],
  }),
  addons: many(registrationAddons),
  payments: many(payments),
}));

export const registrationAddonRelations = relations(
  registrationAddons,
  ({ one }) => ({
    registration: one(registrations, {
      fields: [registrationAddons.registrationId],
      references: [registrations.id],
    }),
    addon: one(eventAddons, {
      fields: [registrationAddons.addonId],
      references: [eventAddons.id],
    }),
  })
);

export const paymentRelations = relations(payments, ({ one }) => ({
  registration: one(registrations, {
    fields: [payments.registrationId],
    references: [registrations.id],
  }),
}));
