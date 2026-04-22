import { pgTable, text, timestamp, boolean, uuid, varchar } from 'drizzle-orm/pg-core';

export const participants = pgTable('participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Data Pribadi
  isForbisMember: boolean('is_forbis_member').default(false),
  forbisMemberId: text('forbis_member_id'), 
  organizationGroupId: uuid('organization_group_id'),
  organizationGroupSlug: text('organization_group_slug'),
  organizationGroupName: text('organization_group_name'),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone').notNull(),
  whatsapp: text('whatsapp').notNull(),
  passwordHash: text('password_hash'),
  whatsappVerifiedAt: timestamp('whatsapp_verified_at'),
  passwordUpdatedAt: timestamp('password_updated_at'),
  isKmiAlumni: boolean('is_kmi_alumni').default(false).notNull(),
  kmiYear: varchar('kmi_year', { length: 4 }), 
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

import { relations } from 'drizzle-orm';
import { participantBusinesses } from './businesses';

export const participantRelations = relations(participants, ({ many }) => ({
  businesses: many(participantBusinesses),
}));
