import * as dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '../../.env' });

const SOURCE_URL =
  'https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/wilayah.sql';
const SOURCE_NAME = 'cahyadsn/wilayah db/wilayah.sql';

type RegionLevel = 'province' | 'regency' | 'district' | 'village';

type RegionRow = {
  code: string;
  level: RegionLevel;
  name: string;
  parentCode: string | null;
};

function resolveLevel(code: string): RegionLevel {
  const parts = code.split('.');

  if (parts.length === 1) {
    return 'province';
  }

  if (parts.length === 2) {
    return 'regency';
  }

  if (parts.length === 3) {
    return 'district';
  }

  return 'village';
}

function resolveParentCode(code: string) {
  const lastDotIndex = code.lastIndexOf('.');

  if (lastDotIndex < 0) {
    return null;
  }

  return code.slice(0, lastDotIndex);
}

function parseWilayahSql(sqlDump: string): RegionRow[] {
  const rows: RegionRow[] = [];
  const tupleRegex = /\('((?:[^']|'')*)','((?:[^']|'')*)'\)/g;

  for (const match of sqlDump.matchAll(tupleRegex)) {
    const code = match[1]?.replaceAll("''", "'").trim();
    const name = match[2]?.replaceAll("''", "'").trim();

    if (!code || !name) {
      continue;
    }

    rows.push({
      code,
      level: resolveLevel(code),
      name,
      parentCode: resolveParentCode(code),
    });
  }

  return rows;
}

async function seedRegions() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  const response = await fetch(SOURCE_URL);

  if (!response.ok) {
    throw new Error(`Gagal mengunduh wilayah.sql: ${response.status}`);
  }

  const sqlDump = await response.text();
  const rows = parseWilayahSql(sqlDump);

  if (rows.length === 0) {
    throw new Error('Tidak ada data wilayah yang berhasil diparse.');
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const sourceUpdatedAt = new Date();

  try {
    await sql.begin(async (tx) => {
      await tx.unsafe(`
        CREATE TABLE IF NOT EXISTS public.indonesia_regions (
          code text PRIMARY KEY,
          name text NOT NULL,
          level text NOT NULL,
          parent_code text,
          source text NOT NULL DEFAULT 'cahyadsn/wilayah',
          source_updated_at timestamp,
          created_at timestamp DEFAULT now(),
          updated_at timestamp DEFAULT now()
        )
      `);
      await tx.unsafe(
        `CREATE INDEX IF NOT EXISTS indonesia_regions_level_parent_idx ON public.indonesia_regions (level, parent_code)`
      );
      await tx.unsafe(
        `CREATE INDEX IF NOT EXISTS indonesia_regions_name_idx ON public.indonesia_regions (name)`
      );
      await tx.unsafe('TRUNCATE public.indonesia_regions');

      const batchSize = 1000;

      for (let index = 0; index < rows.length; index += batchSize) {
        const batch = rows.slice(index, index + batchSize);

        await tx`
          INSERT INTO public.indonesia_regions
            (code, name, level, parent_code, source, source_updated_at, updated_at)
          VALUES ${tx(
            batch.map((row) => [
              row.code,
              row.name,
              row.level,
              row.parentCode,
              SOURCE_NAME,
              sourceUpdatedAt,
              sourceUpdatedAt,
            ])
          )}
        `;
      }
    });

    console.log(`Imported ${rows.length} wilayah rows from ${SOURCE_URL}`);
  } finally {
    await sql.end();
  }
}

seedRegions().catch((error) => {
  console.error('Seed wilayah failed:', error);
  process.exit(1);
});
