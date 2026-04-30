import { notFound } from "next/navigation";
import { getPublishedLegalPage } from "@/actions/public-pages";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";


export const metadata = {
  title: "Kebijakan Privasi",
};

export default async function KebijakanPrivasiPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const resolvedParams = await params;
  const pageData = await getPublishedLegalPage(resolvedParams.eventSlug, "legal_privacy");

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
