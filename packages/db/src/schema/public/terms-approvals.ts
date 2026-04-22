import { relations } from 'drizzle-orm';
import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { expoEvents } from './events';
import { eventPages } from './pages';
import { participants } from './participants';

export const participantTermsApprovals = pgTable('participant_terms_approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => expoEvents.id, { onDelete: 'cascade' }),
  participantId: uuid('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  termsPageId: uuid('terms_page_id').notNull().references(() => eventPages.id, { onDelete: 'restrict' }),
  termsPageSlug: text('terms_page_slug').notNull(),
  termsPageTitle: text('terms_page_title').notNull(),
  termsContentChecksum: text('terms_content_checksum').notNull(),
  termsContentFormat: text('terms_content_format').notNull().default('tiptap_json'),
  approvedAt: timestamp('approved_at', { withTimezone: true }).notNull().defaultNow(),
  approvedAtWib: timestamp('approved_at_wib').notNull(),
  approvedTimezone: text('approved_timezone').notNull().default('Asia/Jakarta'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  approvalSource: text('approval_source').notNull().default('public_web'),
  approvalToken: text('approval_token').notNull(),
  qrPayload: jsonb('qr_payload'),
  isActive: boolean('is_active').notNull().default(true),
  supersededById: uuid('superseded_by_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const participantTermsApprovalsRelations = relations(
  participantTermsApprovals,
  ({ one }) => ({
    event: one(expoEvents, {
      fields: [participantTermsApprovals.eventId],
      references: [expoEvents.id],
    }),
    participant: one(participants, {
      fields: [participantTermsApprovals.participantId],
      references: [participants.id],
    }),
    termsPage: one(eventPages, {
      fields: [participantTermsApprovals.termsPageId],
      references: [eventPages.id],
    }),
  })
);
