import { getPublishedEventHomepage } from "@/actions/public-pages";
import { LandingRenderer } from "@/components/public/blocks/LandingRenderer";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

export default async function EventHomePage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const resolvedParams = await params;
  const pageData = await getPublishedEventHomepage(resolvedParams.eventSlug);

  // Fallback: tidak ada homepage dan tidak ada landing page
  if (!pageData || !pageData.content) {
    return (
      <div className="py-32 text-center px-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Segera Hadir</h1>
        <p className="text-slate-600">Halaman event ini sedang dalam persiapan.</p>
      </div>
    );
  }

  // Render berdasarkan pageType
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
    <div className="py-20 bg-white">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-8">{pageData.title}</h1>
        <article
          className="prose prose-slate prose-lg max-w-none font-sans prose-img:rounded-2xl prose-img:border prose-img:border-slate-100"
          dangerouslySetInnerHTML={{ __html: htmlString }}
        />
      </div>
    </div>
  );
}
