import * as dotenv from 'dotenv';
import { and, asc, eq } from 'drizzle-orm';

import { db } from './client';
import { expoEvents, messageTemplates, organizations } from './schema/public';

dotenv.config({ path: '../../.env' });

const DEFAULT_MESSAGE_TEMPLATES = [
  {
    key: 'booking_diterima',
    title: 'Booking Diterima',
    bodyTemplate:
      "Assalamu'alaikum {{participant_name}}, booking untuk {{company_name}} pada {{event_name}} sudah kami terima. Detail booth: {{booth_list}}.",
    sortOrder: 1,
  },
  {
    key: 'invoice_terbit',
    title: 'Invoice Terbit',
    bodyTemplate:
      'Invoice {{invoice_number}} untuk {{company_name}} sudah terbit dengan total {{invoice_total}}. Silakan lakukan pembayaran melalui {{payment_channel_label}}. Detail: {{payment_instruction}}. Jatuh tempo: {{due_date}}.',
    sortOrder: 2,
  },
  {
    key: 'invoice_terbayar',
    title: 'Invoice Terbayar',
    bodyTemplate:
      'Pembayaran untuk invoice {{invoice_number}} atas nama {{company_name}} telah kami terima. Terima kasih, proses berikutnya akan kami lanjutkan.',
    sortOrder: 3,
  },
] as const;

async function seedEventSettings() {
  const configuredSchemaName = process.env.TENANT_SCHEMA?.trim() || 'expo_forbis2026';
  let activeEvent =
    (configuredSchemaName
      ? await db.query.expoEvents.findFirst({
          where: eq(expoEvents.schemaName, configuredSchemaName),
        })
      : null) ??
    (await db.query.expoEvents.findFirst({
      where: eq(expoEvents.isActive, true),
    })) ??
    (await db.query.expoEvents.findFirst({
      orderBy: (table) => [asc(table.createdAt)],
    }));

  if (!activeEvent) {
    let organization = await db.query.organizations.findFirst({
      where: eq(organizations.slug, 'forbis'),
    });

    if (!organization) {
      const insertedOrganizations = await db
        .insert(organizations)
        .values({
          name: 'FORBIS',
          slug: 'forbis',
        })
        .returning();

      organization = insertedOrganizations[0] ?? null;
    }

    if (!organization) {
      throw new Error('Organisasi default gagal dibuat.');
    }

    const insertedEvents = await db
      .insert(expoEvents)
      .values({
        isActive: true,
        name: 'FORBIS Expo',
        organizationId: organization.id,
        schemaName: configuredSchemaName,
        slug: configuredSchemaName.replace(/_/g, '-'),
      })
      .returning();

    activeEvent = insertedEvents[0] ?? null;
  }

  if (!activeEvent) {
    throw new Error('Event default gagal dibuat.');
  }

  console.log(`Seeding event setting defaults for event: ${activeEvent.slug}`);

  for (const template of DEFAULT_MESSAGE_TEMPLATES) {
    const existingTemplate = await db.query.messageTemplates.findFirst({
      where: and(
        eq(messageTemplates.eventId, activeEvent.id),
        eq(messageTemplates.key, template.key)
      ),
      orderBy: (table) => [asc(table.sortOrder), asc(table.title)],
    });

    if (existingTemplate) {
      await db
        .update(messageTemplates)
        .set({
          bodyTemplate: template.bodyTemplate,
          isActive: true,
          sortOrder: template.sortOrder,
          title: template.title,
          updatedAt: new Date(),
        })
        .where(eq(messageTemplates.id, existingTemplate.id));
    } else {
      await db.insert(messageTemplates).values({
        bodyTemplate: template.bodyTemplate,
        eventId: activeEvent.id,
        isActive: true,
        key: template.key,
        sortOrder: template.sortOrder,
        title: template.title,
      });
    }
  }

  console.log('Event setting default templates seeded.');
}

seedEventSettings().catch((error) => {
  console.error('Seed event setting failed:', error);
  process.exit(1);
});
