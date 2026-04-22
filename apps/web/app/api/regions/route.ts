import { NextResponse } from "next/server";
import { and, asc, eq, ilike, isNull } from "drizzle-orm";

import { db } from "@repo/db";
import { indonesiaRegions } from "@repo/db/schema/public";

const ALLOWED_LEVELS = new Set(["province", "regency", "district", "village"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level")?.trim() ?? "";
  const parentCode = searchParams.get("parentCode")?.trim() ?? "";
  const query = searchParams.get("q")?.trim() ?? "";

  if (!ALLOWED_LEVELS.has(level)) {
    return NextResponse.json({ error: "Level wilayah tidak valid." }, { status: 400 });
  }

  if (level !== "province" && !parentCode) {
    return NextResponse.json({ regions: [] });
  }

  const filters = [
    eq(indonesiaRegions.level, level),
    parentCode ? eq(indonesiaRegions.parentCode, parentCode) : isNull(indonesiaRegions.parentCode),
  ];

  if (query) {
    filters.push(ilike(indonesiaRegions.name, `%${query}%`));
  }

  const regions = await db
    .select({
      code: indonesiaRegions.code,
      name: indonesiaRegions.name,
    })
    .from(indonesiaRegions)
    .where(and(...filters))
    .orderBy(asc(indonesiaRegions.code))
    .limit(50);

  return NextResponse.json(
    { regions },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
