import * as dotenv from 'dotenv';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import postgres from 'postgres';

dotenv.config({ path: '../../.env' });

const HEADERS = [
  'forbis_member_id',
  'name',
  'email',
  'phone',
  'whatsapp',
  'is_kmi_alumni',
  'kmi_year',
  'company_name',
  'booth_name',
  'requested_booth_category_slug',
  'company_description',
  'company_phone',
  'company_whatsapp',
  'company_address',
  'company_province_code',
  'company_province_name',
  'company_regency_code',
  'company_regency_name',
  'company_district_code',
  'company_district_name',
  'company_village_code',
  'company_village_name',
  'legal_entity',
  'business_category',
  'business_sector',
  'brand_name',
  'product_tags',
  'partnership_concepts',
] as const;

type Header = (typeof HEADERS)[number];
type ImportRow = Record<Header, string>;

class RollbackTestSignal extends Error {
  constructor() {
    super('ROLLBACK_TEST');
  }
}

function decodeXml(value: string) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function columnToIndex(cellRef: string) {
  const column = cellRef.match(/^[A-Z]+/)?.[0] ?? '';
  let index = 0;

  for (const char of column) {
    index = index * 26 + char.charCodeAt(0) - 64;
  }

  return index - 1;
}

function normalize(value?: string | null) {
  return value?.trim() ?? '';
}

function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return ['ya', 'yes', 'true', '1', 'y'].includes(normalized);
}

function parseList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildImportKey(row: ImportRow) {
  const value = [
    row.forbis_member_id,
    row.name,
    row.company_name,
    row.booth_name,
    row.brand_name,
  ]
    .map((item) => item.trim().toLowerCase())
    .join('|');

  return createHash('sha256').update(value).digest('hex');
}

async function unzipXlsx(filePath: string) {
  const outputDir = await mkdtemp(join(tmpdir(), 'forbis-members-'));
  const proc = Bun.spawn(['unzip', '-q', filePath, '-d', outputDir], {
    stderr: 'pipe',
    stdout: 'pipe',
  });
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const errorText = await new Response(proc.stderr).text();
    throw new Error(`Gagal membaca file Excel. ${errorText}`);
  }

  return outputDir;
}

async function loadSharedStrings(unzippedDir: string) {
  try {
    const xml = await readFile(join(unzippedDir, 'xl/sharedStrings.xml'), 'utf8');
    const values: string[] = [];
    const stringRegex = /<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g;

    for (const match of xml.matchAll(stringRegex)) {
      const siXml = match[1] ?? '';
      const textParts = [
        ...siXml.matchAll(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g),
      ].map((part) => decodeXml(part[1] ?? ''));
      values.push(textParts.join(''));
    }

    return values;
  } catch {
    return [];
  }
}

function readAttribute(xml: string, name: string) {
  const escapedName = name.replace(':', '\\:');
  return xml.match(new RegExp(`${escapedName}="([^"]*)"`))?.[1] ?? '';
}

async function resolveImportSheetPath(unzippedDir: string) {
  const workbookXml = await readFile(join(unzippedDir, 'xl/workbook.xml'), 'utf8');
  const relsXml = await readFile(join(unzippedDir, 'xl/_rels/workbook.xml.rels'), 'utf8');
  const sheets = [...workbookXml.matchAll(/<(?:\w+:)?sheet\b([^>]*)\/?>/g)].map((match) => {
    const attributes = match[1] ?? '';

    return {
      name: decodeXml(readAttribute(attributes, 'name')),
      relationId: readAttribute(attributes, 'r:id'),
    };
  });
  const relationships = new Map(
    [...relsXml.matchAll(/<(?:\w+:)?Relationship\b([^>]*)\/?>/g)].map((match) => {
      const attributes = match[1] ?? '';
      return [readAttribute(attributes, 'Id'), readAttribute(attributes, 'Target')];
    })
  );
  const selectedSheet =
    sheets.find((sheet) => sheet.name.trim().toLowerCase() === 'forbis_members') ??
    sheets[0];

  if (!selectedSheet) {
    throw new Error('Workbook tidak memiliki worksheet.');
  }

  const target = relationships.get(selectedSheet.relationId);

  if (!target) {
    throw new Error(`Worksheet ${selectedSheet.name || selectedSheet.relationId} tidak bisa ditemukan.`);
  }

  const normalizedTarget = target.startsWith('/')
    ? target.slice(1)
    : target.startsWith('xl/')
      ? target
      : `xl/${target}`;

  return join(unzippedDir, normalizedTarget);
}

async function parseFirstSheet(filePath: string) {
  const unzippedDir = await unzipXlsx(filePath);

  try {
    const sharedStrings = await loadSharedStrings(unzippedDir);
    const sheetXml = await readFile(await resolveImportSheetPath(unzippedDir), 'utf8');
    const rows: string[][] = [];
    const rowRegex = /<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g;

    for (const rowMatch of sheetXml.matchAll(rowRegex)) {
      const rowXml = rowMatch[1] ?? '';
      const cells: string[] = [];
      const cellRegex = /<(?:\w+:)?c\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?c>/g;

      for (const cellMatch of rowXml.matchAll(cellRegex)) {
        const attributes = cellMatch[1] ?? '';
        const cellXml = cellMatch[2] ?? '';
        const cellRef = attributes.match(/r="([^"]+)"/)?.[1] ?? '';
        const type = attributes.match(/t="([^"]+)"/)?.[1] ?? '';
        const rawValue =
          cellXml.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1] ?? '';
        const inlineValue =
          cellXml.match(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/)?.[1] ?? '';
        const columnIndex = columnToIndex(cellRef);

        let value = '';

        if (type === 's') {
          value = sharedStrings[Number(rawValue)] ?? '';
        } else if (type === 'inlineStr') {
          value = decodeXml(inlineValue);
        } else {
          value = decodeXml(rawValue);
        }

        cells[columnIndex] = value;
      }

      rows.push(cells.map((cell) => normalize(cell)));
    }

    return rows;
  } finally {
    await rm(unzippedDir, { force: true, recursive: true });
  }
}

function mapRows(rows: string[][]): ImportRow[] {
  const [headerRow, ...dataRows] = rows;
  const headers = (headerRow ?? []).map((header) => header.trim());
  const missingHeaders = HEADERS.filter((header) => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`Header template tidak lengkap: ${missingHeaders.join(', ')}`);
  }

  const headerIndex = new Map(headers.map((header, index) => [header, index]));

  return dataRows
    .map((row) => {
      const mapped = Object.fromEntries(
        HEADERS.map((header) => [header, normalize(row[headerIndex.get(header) ?? -1])])
      ) as ImportRow;

      return mapped;
    })
    .filter((row) => row.name || row.forbis_member_id);
}

async function importForbisMembers() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  const filePath = process.argv.find((arg, index) => index > 1 && !arg.startsWith('--'));
  const isDryRun = process.argv.includes('--dry-run');
  const isRollbackTest = process.argv.includes('--rollback-test');

  if (!filePath) {
    throw new Error('Path file Excel wajib diberikan. Contoh: bun run db:import:forbis-members ./template.xlsx');
  }

  const rows = mapRows(await parseFirstSheet(filePath));

  if (rows.length === 0) {
    throw new Error('Tidak ada data anggota FORBIS yang bisa diimport.');
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const importBatchId = randomUUID();
  const sourceFileName = filePath.split('/').pop() ?? filePath;

  if (isDryRun) {
    console.log(`Dry run OK. Parsed ${rows.length} FORBIS member rows from ${sourceFileName}.`);
    return;
  }

  try {
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO public.forbis_members
          (
            forbis_member_id,
            name,
            email,
            phone,
            whatsapp,
            is_kmi_alumni,
            kmi_year,
            company_name,
            booth_name,
            requested_booth_category_slug,
            company_description,
            company_phone,
            company_whatsapp,
            company_address,
            company_province_code,
            company_province_name,
            company_regency_code,
            company_regency_name,
            company_district_code,
            company_district_name,
            company_village_code,
            company_village_name,
            legal_entity,
            business_category,
            business_sector,
            brand_name,
            product_tags,
            partnership_concepts,
            import_key,
            import_batch_id,
            source_file_name,
            raw_payload,
            updated_at
          )
        VALUES ${tx(
          rows.map((row) => [
            row.forbis_member_id || null,
            row.name,
            row.email || null,
            row.phone || null,
            row.whatsapp || null,
            parseBoolean(row.is_kmi_alumni),
            row.kmi_year || null,
            row.company_name || null,
            row.booth_name || null,
            row.requested_booth_category_slug || null,
            row.company_description || null,
            row.company_phone || null,
            row.company_whatsapp || null,
            row.company_address || null,
            row.company_province_code || null,
            row.company_province_name || null,
            row.company_regency_code || null,
            row.company_regency_name || null,
            row.company_district_code || null,
            row.company_district_name || null,
            row.company_village_code || null,
            row.company_village_name || null,
            row.legal_entity || null,
            row.business_category || null,
            row.business_sector || null,
            row.brand_name || null,
            parseList(row.product_tags),
            parseList(row.partnership_concepts),
            buildImportKey(row),
            importBatchId,
            sourceFileName,
            JSON.stringify(row),
            new Date(),
          ])
        )}
        ON CONFLICT (import_key)
        DO UPDATE SET
          forbis_member_id = EXCLUDED.forbis_member_id,
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          whatsapp = EXCLUDED.whatsapp,
          is_kmi_alumni = EXCLUDED.is_kmi_alumni,
          kmi_year = EXCLUDED.kmi_year,
          company_name = EXCLUDED.company_name,
          booth_name = EXCLUDED.booth_name,
          requested_booth_category_slug = EXCLUDED.requested_booth_category_slug,
          company_description = EXCLUDED.company_description,
          company_phone = EXCLUDED.company_phone,
          company_whatsapp = EXCLUDED.company_whatsapp,
          company_address = EXCLUDED.company_address,
          company_province_code = EXCLUDED.company_province_code,
          company_province_name = EXCLUDED.company_province_name,
          company_regency_code = EXCLUDED.company_regency_code,
          company_regency_name = EXCLUDED.company_regency_name,
          company_district_code = EXCLUDED.company_district_code,
          company_district_name = EXCLUDED.company_district_name,
          company_village_code = EXCLUDED.company_village_code,
          company_village_name = EXCLUDED.company_village_name,
          legal_entity = EXCLUDED.legal_entity,
          business_category = EXCLUDED.business_category,
          business_sector = EXCLUDED.business_sector,
          brand_name = EXCLUDED.brand_name,
          product_tags = EXCLUDED.product_tags,
          partnership_concepts = EXCLUDED.partnership_concepts,
          import_batch_id = EXCLUDED.import_batch_id,
          source_file_name = EXCLUDED.source_file_name,
          raw_payload = EXCLUDED.raw_payload,
          is_active = true,
          updated_at = EXCLUDED.updated_at
      `;

      if (isRollbackTest) {
        throw new RollbackTestSignal();
      }
    });

    if (isRollbackTest) {
      console.log(`Rollback test OK. Validated ${rows.length} FORBIS member rows without persisting data.`);
    } else {
      console.log(`Imported ${rows.length} FORBIS member rows. Batch: ${importBatchId}`);
    }
  } catch (error) {
    if (error instanceof RollbackTestSignal) {
      console.log(`Rollback test OK. Validated ${rows.length} FORBIS member rows without persisting data.`);
      return;
    }

    throw error;
  } finally {
    await sql.end();
  }
}

importForbisMembers().catch((error) => {
  console.error('Import FORBIS members failed:', error);
  process.exit(1);
});
