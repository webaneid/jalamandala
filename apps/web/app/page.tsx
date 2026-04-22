import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { db } from "@repo/db";
import { expoEvents } from "@repo/db/schema/public";

async function resolveActiveEventSlug() {
  const configuredSchemaName = process.env.TENANT_SCHEMA?.trim();

  if (configuredSchemaName) {
    const schemaEvent = await db.query.expoEvents.findFirst({
      where: eq(expoEvents.schemaName, configuredSchemaName),
      columns: {
        slug: true,
      },
    });

    if (schemaEvent?.slug) {
      return schemaEvent.slug;
    }
  }

  const activeEvent = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.isActive, true),
    columns: {
      slug: true,
    },
  });

  if (activeEvent?.slug) {
    return activeEvent.slug;
  }

  const firstEvent = await db.query.expoEvents.findFirst({
    columns: {
      slug: true,
    },
    orderBy: [asc(expoEvents.createdAt)],
  });

  return firstEvent?.slug ?? null;
}

export default async function RootPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const isExpoHost = host.startsWith("expo.");

  if (isExpoHost) {
    const eventSlug = await resolveActiveEventSlug();

    if (eventSlug) {
      redirect(`/${eventSlug}`);
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div className="max-w-xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Event belum tersedia</h1>
          <p className="text-sm text-slate-600">
            Subdomain expo sudah aktif, tetapi event publik belum dikonfigurasi.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <div className="max-w-xl space-y-3 rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Jalamandala</h1>
        <p className="text-sm text-slate-600">
          Gunakan <span className="font-medium text-slate-900">app.localhost:6250</span> untuk admin dan{" "}
          <span className="font-medium text-slate-900">expo.localhost:6250</span> untuk situs event publik.
        </p>
      </div>
    </main>
  );
}
