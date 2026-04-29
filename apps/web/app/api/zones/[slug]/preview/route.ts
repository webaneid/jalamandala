import { NextRequest, NextResponse } from "next/server";
import { getPublicZoneForBooking } from "@/lib/public-booth-data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const zone = await getPublicZoneForBooking(
    slug,
    { organizationGroupSlug: null },
    { requestedBoothCategorySlug: null }
  );
  if (!zone) return NextResponse.json({ error: "Zone not found" }, { status: 404 });

  // Preview: semua booth open ditampilkan sebagai eligible
  const preview = {
    ...zone,
    booths: zone.booths.map((b) => ({
      ...b,
      isEligible: b.status === "open",
    })),
  };

  return NextResponse.json(preview);
}
