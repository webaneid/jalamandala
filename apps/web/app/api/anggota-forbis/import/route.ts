import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { sql } from "drizzle-orm";

import { db } from "@repo/db";

const HEADERS = [
  "forbis_member_id",
  "name",
  "email",
  "phone",
  "whatsapp",
  "is_kmi_alumni",
  "kmi_year",
  "company_name",
  "booth_name",
  "requested_booth_category_slug",
  "company_description",
  "company_phone",
  "company_whatsapp",
  "company_address",
  "company_province_code",
  "company_province_name",
  "company_regency_code",
  "company_regency_name",
  "company_district_code",
  "company_district_name",
  "company_village_code",
  "company_village_name",
  "legal_entity",
  "business_category",
  "business_sector",
  "brand_name",
  "product_tags",
  "partnership_concepts",
] as const;

type Header = (typeof HEADERS)[number];
type ImportRow = Record<Header, string>;

function normalize(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function parseBoolean(value: string): boolean {
  return ["ya", "yes", "true", "1", "y"].includes(value.trim().toLowerCase());
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildImportKey(row: ImportRow): string {
  const value = [
    row.forbis_member_id,
    row.name,
    row.company_name,
    row.booth_name,
    row.brand_name,
  ]
    .map((s) => s.trim().toLowerCase())
    .join("|");
  return createHash("sha256").update(value).digest("hex");
}

function parseSheet(workbook: XLSX.WorkBook): ImportRow[] {
  const sheetName =
    workbook.SheetNames.find(
      (n) => n.trim().toLowerCase() === "forbis_members"
    ) ?? workbook.SheetNames[0];

  if (!sheetName) throw new Error("Workbook tidak memiliki worksheet.");

  const sheet = workbook.Sheets[sheetName]!;
  const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as string[][];

  const [headerRow, ...dataRows] = rows;
  const headers = (headerRow ?? []).map((h) => normalize(h));

  // Unknown headers are ignored; missing headers are treated as empty columns
  const headerIndex = new Map(headers.map((h, i) => [h, i]));

  return dataRows
    .map((row) => {
      return Object.fromEntries(
        HEADERS.map((h) => {
          const idx = headerIndex.get(h);
          return [h, idx !== undefined ? normalize(row[idx]) : ""];
        })
      ) as ImportRow;
    })
    .filter((row) => row.name || row.forbis_member_id);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const rows = parseSheet(workbook);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data anggota FORBIS yang bisa diimport." },
        { status: 400 }
      );
    }

    const importBatchId = randomUUID();
    const sourceFileName = (file as File).name ?? "upload.xlsx";
    const now = new Date();

    const values = rows.map((row) => ({
      forbisMemberId: row.forbis_member_id || null,
      name: row.name,
      email: row.email || null,
      phone: row.phone || null,
      whatsapp: row.whatsapp || null,
      isKmiAlumni: parseBoolean(row.is_kmi_alumni),
      kmiYear: row.kmi_year || null,
      companyName: row.company_name || null,
      boothName: row.booth_name || null,
      requestedBoothCategorySlug: row.requested_booth_category_slug || null,
      companyDescription: row.company_description || null,
      companyPhone: row.company_phone || null,
      companyWhatsapp: row.company_whatsapp || null,
      companyAddress: row.company_address || null,
      companyProvinceCode: row.company_province_code || null,
      companyProvinceName: row.company_province_name || null,
      companyRegencyCode: row.company_regency_code || null,
      companyRegencyName: row.company_regency_name || null,
      companyDistrictCode: row.company_district_code || null,
      companyDistrictName: row.company_district_name || null,
      companyVillageCode: row.company_village_code || null,
      companyVillageName: row.company_village_name || null,
      legalEntity: row.legal_entity || null,
      businessCategory: row.business_category || null,
      businessSector: row.business_sector || null,
      brandName: row.brand_name || null,
      productTags: parseList(row.product_tags),
      partnershipConcepts: parseList(row.partnership_concepts),
      importKey: buildImportKey(row),
      importBatchId,
      sourceFileName,
      rawPayload: row as unknown as Record<string, unknown>,
      isActive: true,
      updatedAt: now,
    }));

    const { forbisMembers } = await import("@repo/db/schema/public");

    const upsertOne = (v: (typeof values)[number]) =>
      db
        .insert(forbisMembers)
        .values(v)
        .onConflictDoUpdate({
          target: forbisMembers.importKey,
          set: {
            forbisMemberId: sql`excluded.forbis_member_id`,
            name: sql`excluded.name`,
            email: sql`excluded.email`,
            phone: sql`excluded.phone`,
            whatsapp: sql`excluded.whatsapp`,
            isKmiAlumni: sql`excluded.is_kmi_alumni`,
            kmiYear: sql`excluded.kmi_year`,
            companyName: sql`excluded.company_name`,
            boothName: sql`excluded.booth_name`,
            requestedBoothCategorySlug: sql`excluded.requested_booth_category_slug`,
            companyDescription: sql`excluded.company_description`,
            companyPhone: sql`excluded.company_phone`,
            companyWhatsapp: sql`excluded.company_whatsapp`,
            companyAddress: sql`excluded.company_address`,
            companyProvinceCode: sql`excluded.company_province_code`,
            companyProvinceName: sql`excluded.company_province_name`,
            companyRegencyCode: sql`excluded.company_regency_code`,
            companyRegencyName: sql`excluded.company_regency_name`,
            companyDistrictCode: sql`excluded.company_district_code`,
            companyDistrictName: sql`excluded.company_district_name`,
            companyVillageCode: sql`excluded.company_village_code`,
            companyVillageName: sql`excluded.company_village_name`,
            legalEntity: sql`excluded.legal_entity`,
            businessCategory: sql`excluded.business_category`,
            businessSector: sql`excluded.business_sector`,
            brandName: sql`excluded.brand_name`,
            productTags: sql`excluded.product_tags`,
            partnershipConcepts: sql`excluded.partnership_concepts`,
            importBatchId: sql`excluded.import_batch_id`,
            sourceFileName: sql`excluded.source_file_name`,
            rawPayload: sql`excluded.raw_payload`,
            isActive: sql`true`,
            updatedAt: sql`excluded.updated_at`,
          },
        });

    let imported = 0;
    let skipped = 0;
    for (const v of values) {
      try {
        await upsertOne(v);
        imported++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({ success: true, imported, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import gagal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
