import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const waRotatorAgents = pgTable('wa_rotator_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull(),
  name: text('name').notNull(),
  greetingName: text('greeting_name').notNull(),
  waNumber: text('wa_number').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  totalClicks: integer('total_clicks').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const waRotatorClicks = pgTable('wa_rotator_clicks', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull().references(() => waRotatorAgents.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').notNull(),
  source: text('source').default('public_bottom_nav').notNull(),
  clickedAt: timestamp('clicked_at').defaultNow().notNull(),
});

export const waRotatorAgentRelations = relations(waRotatorAgents, ({ many }) => ({
  clicks: many(waRotatorClicks),
}));

export const waRotatorClickRelations = relations(waRotatorClicks, ({ one }) => ({
  agent: one(waRotatorAgents, { fields: [waRotatorClicks.agentId], references: [waRotatorAgents.id] }),
}));
