import { integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { participants } from './participants';

export const participantBusinesses = pgTable('participant_businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  participantId: uuid('participant_id')
    .notNull()
    .references(() => participants.id, { onDelete: 'cascade' }),
  
  // Data Usaha
  companyName: text('company_name').notNull(),
  boothName: text('booth_name'),
  requestedBoothCategoryId: uuid('requested_booth_category_id'),
  requestedBoothCategorySlug: text('requested_booth_category_slug'),
  requestedBoothCategoryName: text('requested_booth_category_name'),
  companyDescription: text('company_description'),
  companyPhone: text('company_phone'),
  companyWhatsapp: text('company_whatsapp'),
  companyAddress: text('company_address'),
  companyProvinceCode: text('company_province_code'),
  companyProvinceName: text('company_province_name'),
  companyRegencyCode: text('company_regency_code'),
  companyRegencyName: text('company_regency_name'),
  companyDistrictCode: text('company_district_code'),
  companyDistrictName: text('company_district_name'),
  companyVillageCode: text('company_village_code'),
  companyVillageName: text('company_village_name'),
  legalEntity: text('legal_entity').notNull(),
  businessCategory: text('business_category').notNull(),
  businessSector: text('business_sector').notNull(),
  brandName: text('brand_name').notNull(),
  
  // Array data (disimpan sebagai text[] di PG)
  productTags: text('product_tags').array(),
  partnershipConcepts: text('partnership_concepts').array(),
  
  logoAssetId: uuid('logo_asset_id'),

  teamMaleCount: integer('team_male_count'),
  teamFemaleCount: integer('team_female_count'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

import { relations } from 'drizzle-orm';

export const businessRelations = relations(participantBusinesses, ({ one }) => ({
  participant: one(participants, {
    fields: [participantBusinesses.participantId],
    references: [participants.id],
  }),
}));
