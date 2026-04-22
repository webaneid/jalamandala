"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

import { upsertEventPage } from "@/actions/pages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaPicker, type MediaPickerValue } from "@/components/admin/media/MediaPicker";
import { BlockEditor, type Block } from "./BlockEditor";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("@/components/editor/RichTextEditor").then((mod) => mod.RichTextEditor),
  { ssr: false }
);

type Props = {
  eventId: string;
  eventSlug: string;
  initialData?: {
    id: string;
    title: string;
    slug: string;
    pageType: string;
    status: string;
    excerpt: string | null;
    contentFormat: string;
    content: any;
    featuredImageAssetId: string | null;
    featuredImage?: any;
    seoTitle: string | null;
    seoDescription: string | null;
  };
};

export function PageEditor({ eventId, eventSlug, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [pageType, setPageType] = useState(initialData?.pageType ?? "default");
  const [status, setStatus] = useState(initialData?.status ?? "draft");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? "");
  const [content, setContent] = useState<any>(initialData?.content ?? null);
  const [featuredImage, setFeaturedImage] = useState<MediaPickerValue>(
    initialData?.featuredImage
      ? {
          id: initialData.featuredImage.id,
          url: initialData.featuredImage.url || (initialData.featuredImage as any).fileUrl || "",
          objectKey: initialData.featuredImage.objectKey || "",
          fileName: initialData.featuredImage.fileName || "",
          mimeType: initialData.featuredImage.mimeType || "",
        }
      : null
  );
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initialData?.seoDescription ?? "");

  const isLegal = pageType === "legal_tnc" || pageType === "legal_privacy";
  const isDefault = pageType === "default";
  const isLanding = pageType === "landing";

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!initialData && isDefault) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""));
    }
  }

  function handlePageTypeChange(val: string) {
    setPageType(val);
    if (val === "legal_tnc") setSlug("syarat-ketentuan");
    if (val === "legal_privacy") setSlug("kebijakan-privasi");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const result = await upsertEventPage({
          id: initialData?.id,
          eventId,
          title,
          slug,
          pageType: pageType as any,
          status: status as any,
          excerpt,
          contentFormat: isLanding ? "page_blocks" : "tiptap_json",
          content: content,
          featuredImageAssetId: featuredImage?.id ?? null,
          seoTitle,
          seoDescription,
        });

        if (result.success) {
          router.push("/admin/laman");
          router.refresh();
        } else {
          setError("Terjadi kesalahan.");
        }
      } catch (err: any) {
        setError(err.message || "Gagal menyimpan laman.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Kiri: Main Content */}
      <div className="w-full lg:w-[70%] space-y-6">
        <Card className="rounded-[28px] border-none bg-white/72 shadow-none overflow-hidden">
          <CardContent className="p-6 space-y-6">
            {error && <div className="text-destructive text-sm font-medium">{error}</div>}
            
            <div className="space-y-2">
              <Input
                placeholder="Judul Halaman"
                className="text-3xl font-bold h-14 px-4 rounded-2xl border-transparent bg-white/50 focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/30"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground ml-2">Slug URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm bg-slate-100 px-3 py-2.5 rounded-xl border border-border/50">
                  /{eventSlug}/
                </span>
                <Input
                  className="rounded-xl border-border/60 bg-white"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={isLegal}
                  required
                />
              </div>
              {isLegal && (
                <p className="text-xs text-muted-foreground ml-2">
                  Slug dikunci sistem untuk halaman legal.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground ml-2">Konten</Label>
              {isLanding ? (
                <div className="mt-4">
                  <BlockEditor
                    blocks={Array.isArray(content?.blocks) ? content.blocks : []}
                    eventSlug={eventSlug}
                    onChange={(blocks) => setContent({ blocks })}
                  />
                </div>
              ) : (
                <div className="mt-2">
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    eventSlug={eventSlug}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanan: Sidebar */}
      <div className="w-full lg:w-[30%] space-y-6 sticky top-24">
        <Card className="rounded-[24px] border-none bg-white/72 shadow-none overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Pengaturan Laman</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Featured Image</Label>
              <MediaPicker
                value={featuredImage}
                onChange={setFeaturedImage}
                folder={`public/events/${eventSlug}/pages/featured`}
                visibility="public"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipe Laman</Label>
              <select
                className="w-full h-10 rounded-xl border border-border/60 bg-white px-3 text-sm outline-none focus:border-primary/40"
                value={pageType}
                onChange={(e) => handlePageTypeChange(e.target.value)}
                disabled={!!initialData}
              >
                <option value="landing">Landing Page</option>
                <option value="default">Default Page</option>
                <option value="legal_tnc">Syarat & Ketentuan</option>
                <option value="legal_privacy">Privacy Policy</option>
              </select>
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-4">
              <div className="space-y-0.5">
                <Label>Publikasikan</Label>
                <p className="text-xs text-muted-foreground">Tampilkan di publik</p>
              </div>
              <select
                className="w-full h-10 rounded-xl border border-border/60 bg-white px-3 text-sm outline-none focus:border-primary/40"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="draft">Draft (Disembunyikan)</option>
                <option value="published">Published (Tampil ke publik)</option>
                <option value="archived">Archived (Diarsipkan)</option>
              </select>
            </div>

            <Button className="w-full rounded-xl gap-2" disabled={isPending} type="submit">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Simpan Laman
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-none bg-white/72 shadow-none overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">SEO & Meta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Ringkasan (Excerpt)</Label>
              <textarea
                className="w-full min-h-[80px] rounded-xl border border-border/60 bg-white p-3 text-sm outline-none focus:border-primary/40"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>SEO Title</Label>
              <Input
                className="rounded-xl border-border/60 bg-white"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>SEO Description</Label>
              <textarea
                className="w-full min-h-[80px] rounded-xl border border-border/60 bg-white p-3 text-sm outline-none focus:border-primary/40"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
