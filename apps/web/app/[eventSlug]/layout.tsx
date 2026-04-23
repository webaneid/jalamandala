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
        background: "linear-gradient(160deg, #081d41 0%, #04101f 55%, #020a14 100%)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,173,238,0.10) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(19,67,151,0.14) 0%, transparent 60%)",
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
