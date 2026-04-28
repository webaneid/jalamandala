import * as dotenv from 'dotenv';
import { asc, eq } from 'drizzle-orm';

import { db, createTenantDb } from './client';
import { expoEvents } from './schema/public';
import {
  addonUnits,
  boothFacilities,
  boothFacilityCatalog,
  boothCategories,
  boothGroups,
  booths,
  eventAddons,
  zonePriceRules,
  zones,
} from './schema/tenant';

dotenv.config({ path: '../../.env' });

type BoothSeed = {
  boothCategorySlug: string;
  boothGroupSlug: string;
  code: string;
  description: string;
  height: number;
  name: string;
  notes?: string;
  shape: string;
  sortOrder: number;
  status: string;
  width: number;
  x: number;
  y: number;
  zoneSlug: string;
};

const PRICE_PHASES = ['early_bird', 'pre_sale', 'regular'] as const;

const DEFAULT_PRICE_RULES: Record<string, Record<string, number>> = {
  forbis: {
    early_bird: 7_500_000,
    pre_sale: 9_000_000,
    regular: 10_000_000,
  },
  public: {
    early_bird: 9_000_000,
    pre_sale: 11_000_000,
    regular: 12_500_000,
  },
  sponsor: {
    early_bird: 30_000_000,
    pre_sale: 30_000_000,
    regular: 30_000_000,
  },
  vip_b: {
    early_bird: 7_500_000,
    pre_sale: 9_000_000,
    regular: 10_000_000,
  },
};

const BOOTH_WIDTH = 84;
const BOOTH_HEIGHT = 42;
const SMALL_GAP = 10;
const LARGE_GAP = 84;

const zoneSeeds = [
  {
    name: 'VIP',
    slug: 'vip',
    description: 'Zona utama untuk tenant VIP.',
    location: 'Area Aligard, bagian depan gedung Aligard',
    colorCode: '#7C3AED',
    sortOrder: 2,
  },
  {
    name: 'Premium',
    slug: 'premium',
    description: 'Zona Premium dengan dua blok besar dan akses panggung.',
    location: 'Area Aligard, bagian tengah gedung Aligard',
    colorCode: '#0EA5E9',
    sortOrder: 3,
  },
  {
    name: 'Festival West',
    slug: 'festival-west',
    description: 'Zona festival sisi barat dengan blok stand memanjang ke bawah.',
    location: 'Sisi barat area festival',
    colorCode: '#F97316',
    sortOrder: 4,
  },
  {
    name: 'Festival North',
    slug: 'festival-north',
    description: 'Zona festival sisi utara dengan blok stand memanjang dari kiri ke kanan.',
    location: 'Sisi utara area festival',
    colorCode: '#10B981',
    sortOrder: 5,
  },
];

const facilitySeeds = [
  {
    name: 'Listrik',
    description: 'Titik listrik untuk operasional booth.',
    sortOrder: 1,
  },
  {
    name: 'Tenda 2 muka',
    description: 'Konfigurasi tenda terbuka dari dua sisi.',
    sortOrder: 2,
  },
  {
    name: 'Meja 1, kursi 1',
    description: 'Fasilitas dasar booth berupa satu meja dan satu kursi.',
    sortOrder: 3,
  },
  {
    name: 'Ukuran 2x2M',
    description: 'Ukuran standar booth 2x2 meter.',
    sortOrder: 4,
  },
];

const addonUnitSeeds = [
  {
    slug: 'kwh',
    name: 'KWH',
    description: 'Satuan konsumsi atau penambahan daya listrik.',
    sortOrder: 1,
  },
  {
    slug: 'm2',
    name: 'M2',
    description: 'Satuan luas tambahan.',
    sortOrder: 2,
  },
  {
    slug: 'item',
    name: 'Item',
    description: 'Satuan item umum.',
    sortOrder: 3,
  },
  {
    slug: '100x100cm',
    name: '100x100cm',
    description: 'Satuan panel atau area khusus ukuran 100x100 cm.',
    sortOrder: 4,
  },
] as const;

const addonSeeds = [
  {
    name: 'Penambahan Daya Listrik',
    description: 'Tambahan daya listrik untuk kebutuhan tenant dan display khusus.',
    price: 100_000,
    sortOrder: 1,
    unitSlug: 'kwh',
  },
] as const;

function createBoothSeed(
  zoneSlug: string,
  code: string,
  sortOrder: number,
  x: number,
  y: number,
  overrides?: Partial<BoothSeed>
): BoothSeed {
  return {
    boothCategorySlug: 'free',
    boothGroupSlug: 'general',
    code,
    description: `Booth ${code} di zona ${zoneSlug}.`,
    height: BOOTH_HEIGHT,
    name: `Booth ${code}`,
    shape: 'rect',
    sortOrder,
    status: 'open',
    width: BOOTH_WIDTH,
    x,
    y,
    zoneSlug,
    ...overrides,
  };
}

const boothGroupSeeds = [
  {
    slug: 'general',
    name: 'Umum',
    description: 'Booth untuk peserta umum.',
    defaultPriceGroup: 'public',
    sortOrder: 1,
  },
  {
    slug: 'forbis',
    name: 'FORBIS',
    description: 'Booth khusus ekosistem FORBIS.',
    defaultPriceGroup: 'forbis',
    sortOrder: 2,
  },
  {
    slug: 'fpag',
    name: 'FPAG',
    description: 'Booth kerja sama FPAG.',
    defaultPriceGroup: 'forbis',
    sortOrder: 3,
  },
  {
    slug: 'formaqin',
    name: 'FORMAQIN',
    description: 'Booth kerja sama FORMAQIN.',
    defaultPriceGroup: 'forbis',
    sortOrder: 4,
  },
  {
    slug: 'sponsor',
    name: 'Sponsor',
    description: 'Booth khusus sponsor.',
    defaultPriceGroup: 'sponsor',
    sortOrder: 5,
  },
  {
    slug: 'gontor',
    name: 'Gontor',
    description: 'Booth khusus ekosistem Gontor.',
    defaultPriceGroup: null,
    sortOrder: 6,
  },
  {
    slug: 'vip-b',
    name: 'VIP B',
    description: 'Booth VIP baris kedua (VIP7–VIP12), harga flat semua tipe peserta.',
    defaultPriceGroup: 'vip_b',
    sortOrder: 7,
  },
];

const boothCategorySeeds = [
  {
    slug: 'free',
    name: 'Bebas',
    description: 'Booth untuk penggunaan bebas, termasuk FnB dan non-FnB.',
    sortOrder: 1,
  },
  {
    slug: 'non_fnb',
    name: 'Non FnB',
    description: 'Booth khusus selain makanan dan minuman.',
    sortOrder: 2,
  },
  {
    slug: 'fnb_dry_food',
    name: 'FnB Dry Food',
    description: 'Booth FnB siap saji atau tanpa dapur aktif.',
    sortOrder: 3,
  },
  {
    slug: 'fnb_kitchen',
    name: 'FnB Kitchen',
    description: 'Booth FnB yang membutuhkan proses masak di tempat.',
    sortOrder: 4,
  },
];

function buildVipSeeds() {
  // Layout: 2 baris, tiap baris 3 kiri + gangway + 3 kanan = 12 booth total
  const leftX = 40;
  const rightX = 480;
  const startY = 102;
  const rowHeight = 62;
  const seeds: BoothSeed[] = [];

  const rows = [
    ['VIP1', 'VIP2', 'VIP3', 'VIP4', 'VIP5', 'VIP6'],
    ['VIP7', 'VIP8', 'VIP9', 'VIP10', 'VIP11', 'VIP12'],
  ];

  rows.forEach((codes, rowIndex) => {
    const y = startY + rowIndex * rowHeight;
    const boothGroupSlug = rowIndex === 1 ? 'vip-b' : 'general';

    codes.slice(0, 3).forEach((code, index) => {
      seeds.push(
        createBoothSeed('vip', code, rowIndex * 6 + index + 1, leftX + index * BOOTH_WIDTH, y, {
          description: 'Booth VIP di Area Aligard.',
          boothGroupSlug,
        })
      );
    });

    codes.slice(3).forEach((code, index) => {
      seeds.push(
        createBoothSeed('vip', code, rowIndex * 6 + index + 4, rightX + index * BOOTH_WIDTH, y, {
          description: 'Booth VIP di Area Aligard.',
          boothGroupSlug,
        })
      );
    });
  });

  return seeds;
}

function buildPremiumSeeds() {
  // Layout: 4 kolom × 8 booth = 32 booth total
  // Kiri-luar (P25-P32) | Kiri-dalam (P1-P8) | [Stage/Area] | Kanan-dalam (P9-P16) | Kanan-luar (P17-P24)
  // Dalam setiap kolom: nomor kecil di bawah (y besar), nomor besar di atas (y kecil)
  const seeds: BoothSeed[] = [];
  const rowH = BOOTH_HEIGHT + SMALL_GAP; // 52
  const startY = 60;
  const outerGap = 40;
  const stageGap = 180;

  const columns = [
    { x: 40,                                                          startNum: 25 }, // kiri-luar
    { x: 40 + BOOTH_WIDTH + outerGap,                                startNum: 1  }, // kiri-dalam
    { x: 40 + BOOTH_WIDTH + outerGap + BOOTH_WIDTH + stageGap,       startNum: 9  }, // kanan-dalam
    { x: 40 + BOOTH_WIDTH + outerGap + BOOTH_WIDTH + stageGap + BOOTH_WIDTH + outerGap, startNum: 17 }, // kanan-luar
  ];

  for (const { x, startNum } of columns) {
    for (let i = 0; i < 8; i++) {
      const num = startNum + i;
      const rowFromTop = 7 - i; // num kecil di bawah (rowFromTop=7), num besar di atas (rowFromTop=0)
      const y = startY + rowFromTop * rowH;
      seeds.push(
        createBoothSeed('premium', `P${num}`, num, x, y, {
          description: 'Booth Premium di Area Aligard.',
          height: BOOTH_HEIGHT,
        })
      );
    }
  }

  return seeds;
}

function buildVerticalFestivalSeeds(
  zoneSlug: string,
  prefix: string,
  total: number,
  highlighted: Record<number, Partial<BoothSeed>>
) {
  const seeds: BoothSeed[] = [];
  const x = 40;
  const startY = 24;

  for (let index = 1; index <= total; index++) {
    const blockIndex = Math.floor((index - 1) / 5);
    const indexInsideBlock = (index - 1) % 5;
    const y =
      startY +
      blockIndex * (BOOTH_HEIGHT * 5 + LARGE_GAP) +
      indexInsideBlock * (BOOTH_HEIGHT + SMALL_GAP);

    seeds.push(
      createBoothSeed(zoneSlug, `${prefix}${index}`, index, x, y, {
        description: `Booth ${prefix}${index} di zona ${zoneSlug}.`,
        ...highlighted[index],
      })
    );
  }

  return seeds;
}

function buildHorizontalFestivalSeeds(
  zoneSlug: string,
  prefix: string,
  total: number,
  highlighted: Record<number, Partial<BoothSeed>>
) {
  const seeds: BoothSeed[] = [];
  const startX = 24;
  const y = 40;

  for (let index = 1; index <= total; index++) {
    const blockIndex = Math.floor((index - 1) / 5);
    const indexInsideBlock = (index - 1) % 5;
    const x =
      startX +
      blockIndex * (BOOTH_WIDTH * 5 + LARGE_GAP) +
      indexInsideBlock * (BOOTH_WIDTH + SMALL_GAP);

    seeds.push(
      createBoothSeed(zoneSlug, `${prefix}${index}`, index, x, y, {
        description: `Booth ${prefix}${index} di zona ${zoneSlug}.`,
        ...highlighted[index],
      })
    );
  }

  return seeds;
}

const boothSeeds: BoothSeed[] = [
  ...buildVipSeeds(),            // VIP1–VIP12    (12 booth)
  ...buildPremiumSeeds(),        // P1–P32        (32 booth)
  ...buildVerticalFestivalSeeds('festival-west', 'FW', 27, {}),   // FW1–FW27  (27 booth)
  ...buildHorizontalFestivalSeeds('festival-north', 'FN', 27, {}), // FN1–FN27  (27 booth)
];

async function resolveTenantSchemaName() {
  const explicitSchemaName = process.argv[2] ?? process.env.TENANT_SCHEMA;

  if (explicitSchemaName) {
    return explicitSchemaName;
  }

  const activeEvent = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.isActive, true),
  });

  if (!activeEvent?.schemaName) {
    throw new Error(
      'Schema tenant tidak ditemukan. Berikan argumen schema atau set TENANT_SCHEMA.'
    );
  }

  return activeEvent.schemaName;
}

async function seedBoothCatalog() {
  const schemaName = await resolveTenantSchemaName();
  const tenantDb = await createTenantDb(schemaName);

  console.log(`Seeding booth catalog for schema: ${schemaName}`);

  for (const zone of zoneSeeds) {
    await tenantDb
      .insert(zones)
      .values(zone)
      .onConflictDoUpdate({
        target: zones.slug,
        set: {
          name: zone.name,
          description: zone.description,
          location: zone.location,
          colorCode: zone.colorCode,
          sortOrder: zone.sortOrder,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }

  const desiredZoneSlugs = new Set(zoneSeeds.map((zone) => zone.slug));
  const existingZones = await tenantDb.query.zones.findMany({
    orderBy: (table) => [asc(table.sortOrder), asc(table.name)],
  });

  for (const existingZone of existingZones) {
    if (!desiredZoneSlugs.has(existingZone.slug)) {
      await tenantDb.delete(zones).where(eq(zones.id, existingZone.id));
    }
  }

  for (const boothGroup of boothGroupSeeds) {
    await tenantDb
      .insert(boothGroups)
      .values(boothGroup)
      .onConflictDoUpdate({
        target: boothGroups.slug,
        set: {
          name: boothGroup.name,
          description: boothGroup.description,
          defaultPriceGroup: boothGroup.defaultPriceGroup,
          sortOrder: boothGroup.sortOrder,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }

  for (const boothCategory of boothCategorySeeds) {
    await tenantDb
      .insert(boothCategories)
      .values(boothCategory)
      .onConflictDoUpdate({
        target: boothCategories.slug,
        set: {
          name: boothCategory.name,
          description: boothCategory.description,
          sortOrder: boothCategory.sortOrder,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }

  for (const addonUnit of addonUnitSeeds) {
    await tenantDb
      .insert(addonUnits)
      .values(addonUnit)
      .onConflictDoUpdate({
        target: addonUnits.slug,
        set: {
          name: addonUnit.name,
          description: addonUnit.description,
          sortOrder: addonUnit.sortOrder,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }

  const zoneRows = await tenantDb.query.zones.findMany({
    orderBy: (table) => [asc(table.sortOrder)],
  });
  const zoneBySlug = new Map(zoneRows.map((zone) => [zone.slug, zone]));
  const boothGroupRows = await tenantDb.query.boothGroups.findMany({
    orderBy: (table) => [asc(table.sortOrder), asc(table.name)],
  });
  const boothGroupBySlug = new Map(boothGroupRows.map((group) => [group.slug, group]));
  const boothCategoryRows = await tenantDb.query.boothCategories.findMany({
    orderBy: (table) => [asc(table.sortOrder), asc(table.name)],
  });
  const addonUnitRows = await tenantDb.query.addonUnits.findMany({
    orderBy: (table) => [asc(table.sortOrder), asc(table.name)],
  });
  const boothCategoryBySlug = new Map(
    boothCategoryRows.map((category) => [category.slug, category])
  );
  const addonUnitBySlug = new Map(addonUnitRows.map((unit) => [unit.slug, unit]));
  const desiredCodes = new Set(boothSeeds.map((booth) => booth.code));

  const existingBooths = await tenantDb.query.booths.findMany({
    orderBy: (table) => [asc(table.sortOrder), asc(table.code)],
  });

  for (const existingBooth of existingBooths) {
    if (!desiredCodes.has(existingBooth.code)) {
      await tenantDb.delete(booths).where(eq(booths.id, existingBooth.id));
    }
  }

  for (const booth of boothSeeds) {
    const zone = zoneBySlug.get(booth.zoneSlug);

    if (!zone) {
      throw new Error(`Zone ${booth.zoneSlug} tidak ditemukan saat seed booth.`);
    }
    const boothGroup = boothGroupBySlug.get(booth.boothGroupSlug);
    const boothCategory = boothCategoryBySlug.get(booth.boothCategorySlug);

    if (!boothGroup) {
      throw new Error(`Booth group ${booth.boothGroupSlug} tidak ditemukan saat seed booth.`);
    }

    if (!boothCategory) {
      throw new Error(
        `Booth category ${booth.boothCategorySlug} tidak ditemukan saat seed booth.`
      );
    }

    await tenantDb
      .insert(booths)
      .values({
        zoneId: zone.id,
        boothGroupId: boothGroup.id,
        boothCategoryId: boothCategory.id,
        code: booth.code,
        name: booth.name,
        description: booth.description,
        status: booth.status,
        sortOrder: booth.sortOrder,
        x: booth.x,
        y: booth.y,
        width: booth.width,
        height: booth.height,
        rotation: 0,
        shape: booth.shape,
        notes: booth.notes,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: booths.code,
        set: {
          zoneId: zone.id,
          boothGroupId: boothGroup.id,
          boothCategoryId: boothCategory.id,
          name: booth.name,
          description: booth.description,
          status: booth.status,
          sortOrder: booth.sortOrder,
          x: booth.x,
          y: booth.y,
          width: booth.width,
          height: booth.height,
          rotation: 0,
          shape: booth.shape,
          notes: booth.notes ?? null,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }

  const boothRows = await tenantDb.query.booths.findMany({
    orderBy: (table) => [asc(table.sortOrder), asc(table.code)],
  });

  for (const facility of facilitySeeds) {
    await tenantDb
      .insert(boothFacilityCatalog)
      .values(facility)
      .onConflictDoUpdate({
        target: boothFacilityCatalog.name,
        set: {
          description: facility.description,
          sortOrder: facility.sortOrder,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }

  for (const addon of addonSeeds) {
    const addonUnit = addonUnitBySlug.get(addon.unitSlug);

    if (!addonUnit) {
      throw new Error(`Addon unit ${addon.unitSlug} tidak ditemukan saat seed add-on.`);
    }
    const existingAddon = await tenantDb.query.eventAddons.findFirst({
      where: eq(eventAddons.name, addon.name),
    });

    if (existingAddon) {
      await tenantDb
        .update(eventAddons)
        .set({
          description: addon.description,
          addonUnitId: addonUnit.id,
          price: addon.price,
          sortOrder: addon.sortOrder,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(eventAddons.id, existingAddon.id));
    } else {
      await tenantDb.insert(eventAddons).values({
        name: addon.name,
        description: addon.description,
        addonUnitId: addonUnit.id,
        price: addon.price,
        sortOrder: addon.sortOrder,
        isActive: true,
      });
    }
  }

  const facilityRows = await tenantDb.query.boothFacilityCatalog.findMany({
    orderBy: (table) => [asc(table.sortOrder), asc(table.name)],
  });

  for (const zone of zoneRows) {
    // Sponsor dan vip_b hanya di zona VIP
    const priceGroups = zone.slug === 'vip'
      ? (['forbis', 'public', 'sponsor', 'vip_b'] as const)
      : (['forbis', 'public'] as const);

    for (const priceGroup of priceGroups) {
      for (const pricePhase of PRICE_PHASES) {
        await tenantDb
          .insert(zonePriceRules)
          .values({
            zoneId: zone.id,
            priceGroup,
            pricePhase,
            price: DEFAULT_PRICE_RULES[priceGroup][pricePhase],
            currency: 'IDR',
            isActive: true,
          })
          .onConflictDoUpdate({
            target: [
              zonePriceRules.zoneId,
              zonePriceRules.priceGroup,
              zonePriceRules.pricePhase,
            ],
            set: {
              price: DEFAULT_PRICE_RULES[priceGroup][pricePhase],
              currency: 'IDR',
              isActive: true,
              updatedAt: new Date(),
            },
          });
      }
    }
  }

  for (const booth of boothRows) {
    for (const facility of facilityRows) {
      await tenantDb
        .insert(boothFacilities)
        .values({
          boothId: booth.id,
          facilityId: facility.id,
          value: facility.name === 'Ukuran 2x2M' ? '2x2M' : null,
        })
        .onConflictDoUpdate({
          target: [boothFacilities.boothId, boothFacilities.facilityId],
          set: {
            value: facility.name === 'Ukuran 2x2M' ? '2x2M' : null,
            updatedAt: new Date(),
          },
        });
    }
  }

  console.log(
    `Seed selesai: ${zoneRows.length} zona, ${boothRows.length} booth, ${facilityRows.length} fasilitas.`
  );
}

seedBoothCatalog()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed booth gagal:', error);
    process.exit(1);
  });
