import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventContextBySlug, getPublishedEventMenus } from "@/actions/public-pages";
import { getCurrentParticipantSession } from "@/lib/participant-session";
import { PublicEventHeader } from "@/components/public/PublicEventHeader";

export default async function PublicEventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventSlug: string }>;
}) {
  const resolvedParams = await params;
  const [event, session] = await Promise.all([
    getEventContextBySlug(resolvedParams.eventSlug),
    getCurrentParticipantSession(),
  ]);

  if (!event) {
    notFound();
  }

  const eventPagesData = (event as any).pages || [];
  const legalTnc = eventPagesData.find((p: any) => p.pageType === "legal_tnc");
  const legalPrivacy = eventPagesData.find((p: any) => p.pageType === "legal_privacy");

  const participantInfo =
    session && session.eventSlug === event.slug
      ? { name: session.name, eventSlug: session.eventSlug }
      : null;

  return (
    <div
      className="relative min-h-screen text-white"
      style={{
        background: "linear-gradient(135deg, #050e1f 0%, #0a1f48 30%, #071630 55%, #040c1a 100%)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 50% at 50% 0%, rgba(19,67,151,0.28) 0%, transparent 55%), radial-gradient(ellipse 70% 40% at 50% 45%, rgba(0,173,238,0.07) 0%, transparent 60%), radial-gradient(ellipse 50% 30% at 80% 85%, rgba(19,67,151,0.18) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <PublicEventHeader
          eventSlug={event.slug}
          eventName={event.name}
          startDate={event.startDate ? event.startDate.toISOString() : null}
          participant={participantInfo}
        />

        <main className="flex-1">
          {children}
        </main>

        <footer className="border-t border-white/8 py-8">
          <div className="mx-auto max-w-[720px] px-5 flex flex-col gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-white/40">
              &copy; {new Date().getFullYear()} {event.name}. Hak cipta dilindungi.
            </p>
            <div className="flex justify-center gap-5 text-sm sm:justify-end">
              {legalTnc && (
                <Link href={`/${event.slug}/syarat-ketentuan`} className="text-white/40 transition hover:text-white/70">
                  Syarat & Ketentuan
                </Link>
              )}
              {legalPrivacy && (
                <Link href={`/${event.slug}/kebijakan-privasi`} className="text-white/40 transition hover:text-white/70">
                  Kebijakan Privasi
                </Link>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
