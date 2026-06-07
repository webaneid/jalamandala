import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedEventPageBySlug } from "@/actions/public-pages";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { LandingRenderer } from "@/components/public/blocks/LandingRenderer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventSlug: string; slug: string }>;
}): Promise<Metadata> {
  const { eventSlug, slug } = await params;
  const page = await getPublishedEventPageBySlug(eventSlug, slug);
  if (!page) return {};
  const title = page.seoTitle ?? page.title;
  const description = page.seoDescription ?? page.excerpt ?? undefined;
  const imageId = page.featuredImageAssetId;
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

export default async function DefaultHalamanPage({
  params,
}: {
  params: Promise<{ eventSlug: string; slug: string }>;
}) {
  const resolvedParams = await params;
  const pageData = await getPublishedEventPageBySlug(resolvedParams.eventSlug, resolvedParams.slug);

  if (!pageData) {
    notFound();
  }

  // page_blocks — render dengan LandingRenderer (block editor content)
  if (pageData.contentFormat === "page_blocks") {
    const content = pageData.content as any;
    const blocks = Array.isArray(content?.blocks) ? content.blocks : [];
    return <LandingRenderer blocks={blocks} event={pageData.event} />;
  }

  // tiptap_json — render dengan Tiptap HTML generator
  let htmlString = "";
  if (pageData.content) {
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
  }

  return (
    <div className="py-14">
      <div className="mx-auto max-w-[720px] px-5">
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-white">{pageData.title}</h1>
        <div className="rounded-[15px] border border-white/10 bg-white/10 p-[15px] backdrop-blur-sm sm:p-5">
          <article
            className="prose prose-forbis max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlString }}
          />
        </div>
      </div>
    </div>
  );
}
