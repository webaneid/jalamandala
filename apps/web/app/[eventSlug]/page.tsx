import type { Metadata } from "next";
import { getPublishedEventHomepage } from "@/actions/public-pages";
import { LandingRenderer } from "@/components/public/blocks/LandingRenderer";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { PublicContainer } from "@/components/public/ui/PublicContainer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}): Promise<Metadata> {
  const { eventSlug } = await params;
  const page = await getPublishedEventHomepage(eventSlug);
  if (!page) return {};
  const title = (page as any).seoTitle ?? page.title;
  const description = (page as any).seoDescription ?? (page as any).excerpt ?? undefined;
  const imageId = (page as any).featuredImageAssetId;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(imageId ? { images: [`/api/media/${imageId}`] } : {}),
    },
  };
}

export default async function EventHomePage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const resolvedParams = await params;
  const pageData = await getPublishedEventHomepage(resolvedParams.eventSlug);

  if (!pageData || !pageData.content) {
    return (
      <div className="py-32 text-center">
        <h1 className="text-3xl font-bold text-white">Segera Hadir</h1>
        <p className="mt-3 text-white/50">Halaman event ini sedang dalam persiapan.</p>
      </div>
    );
  }

  if (pageData.pageType === "landing") {
    const blocks = (pageData.content as any).blocks || [];
    return <LandingRenderer blocks={blocks} event={(pageData as any).event} />;
  }

  // Default page (tiptap HTML)
  let htmlString = "";
  if (pageData.contentFormat === "tiptap_json" && pageData.content) {
    let contentObj = pageData.content;
    if (typeof contentObj === "string") {
      try { contentObj = JSON.parse(contentObj); } catch {}
    }
    if (typeof contentObj === "object" && contentObj !== null) {
      try {
        htmlString = generateHTML(contentObj as any, [StarterKit, Image]);
      } catch (e) {
        console.error("Failed to generate HTML:", e);
      }
    } else {
      htmlString = String(contentObj);
    }
  } else {
    htmlString = typeof pageData.content === "string"
      ? pageData.content
      : JSON.stringify(pageData.content, null, 2);
  }

  return (
    <div className="py-14">
      <PublicContainer>
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-white">{pageData.title}</h1>
        <article
          className="prose prose-invert prose-sm max-w-none prose-img:rounded-2xl"
          dangerouslySetInnerHTML={{ __html: htmlString }}
        />
      </PublicContainer>
    </div>
  );
}
