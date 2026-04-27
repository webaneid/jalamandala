import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@repo/db";
import { eventAgendas, expoEvents } from "@repo/db/schema/public";
import { sendWhatsApp } from "@/lib/whatsapp";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(d);

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const event = await db.query.expoEvents.findFirst({
      where: eq(expoEvents.schemaName, TENANT_SCHEMA),
    });

    const teamNumbers: string[] = event?.eventTeamWaNumbers ?? [];
    if (!teamNumbers.length) {
      return NextResponse.json({ ok: true, skipped: "no team numbers" });
    }

    // Tomorrow's date range in WIB (UTC+7)
    const nowUtc = new Date();
    const tomorrowWib = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);
    tomorrowWib.setUTCDate(tomorrowWib.getUTCDate() + 1);
    const tomorrowStart = new Date(Date.UTC(tomorrowWib.getUTCFullYear(), tomorrowWib.getUTCMonth(), tomorrowWib.getUTCDate()) - 7 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

    const agendas = await db.query.eventAgendas.findMany({
      where: and(
        eq(eventAgendas.eventId, event!.id),
        gte(eventAgendas.startAt, tomorrowStart),
        lt(eventAgendas.startAt, tomorrowEnd),
        eq(eventAgendas.status, "published"),
      ),
      orderBy: (t) => [asc(t.sortOrder), asc(t.startAt)],
    });

    if (agendas.length === 0) {
      return NextResponse.json({ ok: true, skipped: "no agendas tomorrow" });
    }

    const fmtDateLabel = new Intl.DateTimeFormat("id-ID", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Jakarta",
    }).format(tomorrowStart);

    const lines = agendas.map((a) => {
      const time = `${fmtTime(a.startAt)}${a.endAt ? `–${fmtTime(a.endAt)}` : ""}`;
      const venue = a.stageName ?? a.venueName ?? "";
      const speakers = a.speakerNames?.length ? ` | ${a.speakerNames.join(", ")}` : "";
      return `• ${time} — *${a.title}*${venue ? ` (${venue})` : ""}${speakers}`;
    });

    const message = `📋 *Rundown Besok — ${fmtDateLabel}*\n\n${lines.join("\n")}\n\nSelamat bertugas! 💪`;

    for (const number of teamNumbers) {
      await sendWhatsApp({ to: number, message, context: "tim-acara-rundown" });
    }

    return NextResponse.json({ ok: true, sent: teamNumbers.length, agendas: agendas.length });
  } catch (err) {
    console.error("tim-acara-rundown cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
