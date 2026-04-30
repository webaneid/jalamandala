import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedEventPageBySlug } from "@/actions/public-pages";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

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

  // Render konten mentah / string JSON untuk v1 sebelum full Tiptap renderer dibuat
  let htmlString = "";
  if (pageData.contentFormat === "tiptap_json" && pageData.content) {
    let contentObj = pageData.content;
    if (typeof contentObj === "string") {
      try { contentObj = JSON.parse(contentObj); } catch {}
    }
    if (typeof contentObj === "object" && contentObj !== null) {
      try {
        htmlString = generateHTML(contentObj, [StarterKit, Image]);
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
      <div className="mx-auto max-w-[720px] px-5">
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-white">{pageData.title}</h1>
        
        <article 
          className="prose prose-forbis max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlString }}
        />
      </div>
    </div>
  );
}
