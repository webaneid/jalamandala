import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne, or } from "drizzle-orm";

import { db } from "@repo/db";
import { participants } from "@repo/db/schema/public";

// Returns the name of the first participant matching each field, or null if not taken.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim().toLowerCase() || null;
  const phone = searchParams.get("phone")?.trim() || null;
  const whatsapp = searchParams.get("whatsapp")?.trim() || null;
  const excludeId = searchParams.get("excludeId") || null;

  if (!email && !phone && !whatsapp) {
    return NextResponse.json({ email: null, phone: null, whatsapp: null });
  }

  const conditions = [];
  if (email) conditions.push(eq(participants.email, email));
  if (phone) conditions.push(eq(participants.phone, phone));
  if (whatsapp) conditions.push(eq(participants.whatsapp, whatsapp));

  const baseWhere = excludeId
    ? and(or(...conditions)!, ne(participants.id, excludeId))
    : or(...conditions)!;

  const rows = await db
    .select({ id: participants.id, name: participants.name, email: participants.email, phone: participants.phone, whatsapp: participants.whatsapp })
    .from(participants)
    .where(baseWhere)
    .limit(10);

  function findName(field: string | null, getValue: (r: typeof rows[number]) => string | null) {
    if (!field) return null;
    return rows.find((r) => getValue(r)?.toLowerCase() === field.toLowerCase())?.name ?? null;
  }

  return NextResponse.json({
    email: findName(email, (r) => r.email),
    phone: findName(phone, (r) => r.phone),
    whatsapp: findName(whatsapp, (r) => r.whatsapp),
  });
}
