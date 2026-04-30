import { notFound } from "next/navigation";
import { getPublishedLegalPage } from "@/actions/public-pages";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";


export const metadata = {
  title: "Syarat & Ketentuan",
};

export default async function SyaratKetentuanPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const resolvedParams = await params;
  const pageData = await getPublishedLegalPage(resolvedParams.eventSlug, "legal_tnc");

  if (!pageData) {
    notFound();
  }

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
