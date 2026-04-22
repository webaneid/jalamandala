import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventContextBySlug, getPublishedEventMenus } from "@/actions/public-pages";
import { PublicEventHeader } from "@/components/public/PublicEventHeader";

function resolveMenuUrl(menu: any, eventSlug: string) {
  if (menu.sourceType === "external") return menu.externalUrl || "#";
  if (menu.sourceType === "system") {
    if (menu.systemKey === "homepage") return `/${eventSlug}`;
    if (menu.systemKey === "agenda") return `/${eventSlug}/agenda`;
    if (menu.systemKey === "booth") return `/${eventSlug}/booth`;
    return `/${eventSlug}/${menu.systemKey}`;
  }
  if (menu.sourceType === "page" && menu.page) {
    if (menu.page.pageType === "legal_tnc") return `/${eventSlug}/syarat-ketentuan`;
    if (menu.page.pageType === "legal_privacy") return `/${eventSlug}/kebijakan-privasi`;
    return `/${eventSlug}/halaman/${menu.page.slug}`;
  }
  return "#";
}

export default async function PublicEventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventSlug: string }>;
}) {
  const resolvedParams = await params;
  const [event, menus] = await Promise.all([
    getEventContextBySlug(resolvedParams.eventSlug),
    getPublishedEventMenus(resolvedParams.eventSlug)
  ]);

  if (!event) {
    notFound();
  }

  // Cari link legal dari data pages yang ada
  const eventPagesData = (event as any).pages || [];
  const legalTnc = eventPagesData.find((p: any) => p.pageType === "legal_tnc");
  const legalPrivacy = eventPagesData.find((p: any) => p.pageType === "legal_privacy");
  const logoSrc = event.logoAssetId ? `/api/media/${event.logoAssetId}` : null;
  const headerMenus = menus.map((menu: any) => ({
    id: menu.id,
    label: menu.label,
    href: resolveMenuUrl(menu, event.slug),
    openInNewTab: menu.openInNewTab,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-white bg-[radial-gradient(circle_at_12%_0%,rgba(0,173,238,0.22),transparent_32%),radial-gradient(circle_at_86%_4%,rgba(19,67,151,0.18),transparent_30%),linear-gradient(180deg,#c6d4e9_0%,#e5f7fd_24rem,#ffffff_42rem)] bg-[length:100%_640px] bg-no-repeat">
      <PublicEventHeader event={event} logoSrc={logoSrc} menus={headerMenus} />

      <main className="flex-1">
        {children}
      </main>

      {/* Global Minimal Footer */}
      <footer className="bg-white border-t border-slate-100 py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} {event.name}. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-slate-500">
            {legalTnc && (
              <Link href={`/${event.slug}/syarat-ketentuan`} className="hover:text-slate-900">
                Syarat & Ketentuan
              </Link>
            )}
            {legalPrivacy && (
              <Link href={`/${event.slug}/kebijakan-privasi`} className="hover:text-slate-900">
                Kebijakan Privasi
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
