"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { MediaPicker, type MediaPickerValue } from "@/components/admin/media/MediaPicker";

type Props = {
  type: string;
  payload: any;
  eventSlug: string;
  onChange: (payload: any) => void;
};

export function BlockForm({ type, payload, eventSlug, onChange }: Props) {
  function update(key: string, value: any) {
    onChange({ ...payload, [key]: value });
  }

  function updateMany(values: Record<string, any>) {
    onChange({ ...payload, ...values });
  }

  switch (type) {
    case "hero":
    case "cta_banner":
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Judul (Title) *</Label>
            <Input 
              value={payload.title || ""} 
              onChange={(e) => update("title", e.target.value)} 
              placeholder="Contoh: Sambut Masa Depan"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Subjudul (Subtitle)</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={payload.subtitle || ""}
              onChange={(e) => update("subtitle", e.target.value)}
              placeholder="Deskripsi singkat atau subjudul"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Teks Tombol (CTA Text)</Label>
              <Input 
                value={payload.cta_text || ""} 
                onChange={(e) => update("cta_text", e.target.value)} 
                placeholder="Contoh: Daftar Sekarang"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Link Tombol (CTA Link)</Label>
              <Input 
                value={payload.cta_link || ""} 
                onChange={(e) => update("cta_link", e.target.value)} 
                placeholder="Contoh: /daftar atau https://..."
              />
            </div>
          </div>
          {type === "hero" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Gambar Hero</Label>
                <MediaPicker
                  value={
                    payload.heroImageAssetId || payload.heroImage
                      ? {
                          id: payload.heroImageAssetId || "",
                          url: payload.heroImage || (payload.heroImageAssetId ? `/api/media/${payload.heroImageAssetId}` : ""),
                          objectKey: payload.heroImageObjectKey || "",
                          fileName: payload.heroImageFileName || "hero-image",
                          mimeType: payload.heroImageMimeType || "image/*",
                        }
                      : null
                  }
                  onChange={(asset: MediaPickerValue) => {
                    updateMany({
                      heroImageAssetId: asset?.id ?? null,
                      heroImage: asset?.url ?? null,
                      heroImageObjectKey: asset?.objectKey ?? null,
                      heroImageFileName: asset?.fileName ?? null,
                      heroImageMimeType: asset?.mimeType ?? null,
                    });
                  }}
                  accept="image"
                  folder={`public/events/${eventSlug}/pages/landing/hero`}
                  visibility="public"
                  placeholder="Pilih atau upload gambar hero..."
                />
              </div>

              <div className="space-y-1.5">
                <Label>Alignment</Label>
                <select
                  className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={payload.align || "center"}
                  onChange={(e) => update("align", e.target.value)}
                >
                  <option value="center">Center</option>
                  <option value="left">Left</option>
                </select>
              </div>
            </div>
          )}
        </div>
      );

    case "problem_statement":
    case "tenant_cta":
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Judul (Title) *</Label>
            <Input 
              value={payload.title || ""} 
              onChange={(e) => update("title", e.target.value)} 
            />
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi (Description)</Label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={payload.description || ""}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
          {type === "tenant_cta" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Teks Tombol</Label>
                <Input value={payload.cta_text || ""} onChange={(e) => update("cta_text", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Link Tombol</Label>
                <Input value={payload.cta_link || ""} onChange={(e) => update("cta_link", e.target.value)} />
              </div>
            </div>
          )}
        </div>
      );

    case "highlight_cards":
      const cards = payload.cards || [];
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Judul Section (Opsional)</Label>
            <Input 
              value={payload.title || ""} 
              onChange={(e) => update("title", e.target.value)} 
              placeholder="Keunggulan Event Kami"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi Section (Opsional)</Label>
            <textarea
              className="flex min-h-[72px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={payload.description || ""}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Kalimat pendek untuk menjelaskan section ini"
            />
          </div>
          
          <div className="space-y-3">
            <Label>Kartu (Cards)</Label>
            {cards.map((card: any, index: number) => (
              <div key={index} className="flex gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl relative group">
                <div className="flex-1 space-y-3">
                  <Input 
                    value={card.title || ""} 
                    onChange={(e) => {
                      const newCards = [...cards];
                      newCards[index] = { ...newCards[index], title: e.target.value };
                      update("cards", newCards);
                    }} 
                    placeholder="Judul Kartu"
                  />
                  <textarea
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={card.description || ""}
                    onChange={(e) => {
                      const newCards = [...cards];
                      newCards[index] = { ...newCards[index], description: e.target.value };
                      update("cards", newCards);
                    }}
                    placeholder="Deskripsi..."
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive self-start"
                  onClick={() => update("cards", cards.filter((_: any, i: number) => i !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-dashed gap-2"
              onClick={() => update("cards", [...cards, { title: "", description: "" }])}
            >
              <Plus className="size-4" />
              Tambah Kartu
            </Button>
          </div>
        </div>
      );

    case "momentum_banner":
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Judul</Label>
            <Input
              value={payload.title || ""}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Momentum 100 Tahun Gontor"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <textarea
              className="flex min-h-[88px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={payload.description || ""}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Momen emas ini hanya terjadi sekali seumur hidup..."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Teks Besar Kanan</Label>
              <Input
                value={payload.statTitle || ""}
                onChange={(e) => update("statTitle", e.target.value)}
                placeholder="1926 - 2026"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Label Kecil Kanan</Label>
              <Input
                value={payload.statLabel || ""}
                onChange={(e) => update("statLabel", e.target.value)}
                placeholder="A Century of Legacy"
              />
            </div>
          </div>
        </div>
      );

    case "tenant_zones":
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Eyebrow</Label>
            <Input
              value={payload.eyebrow || ""}
              onChange={(e) => update("eyebrow", e.target.value)}
              placeholder="Pendaftaran Tenant Expo"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Judul</Label>
            <Input
              value={payload.title || ""}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Pilih Zona Bisnis Anda"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <textarea
              className="flex min-h-[88px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={payload.description || ""}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Pilih dari 140+ titik strategis..."
            />
          </div>
          <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-xs leading-6 text-primary-900">
            Data kartu zona diambil otomatis dari database booth: nama zona, deskripsi, lokasi, harga, fasilitas, jumlah booth, dan gambar zona jika sudah diatur di admin booth.
          </div>
        </div>
      );

    case "logo_slider":
      const customLogos = Array.isArray(payload.customLogos) ? payload.customLogos : [];
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Judul Section (Opsional)</Label>
            <Input
              value={payload.title || ""}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Dipercaya oleh tenant, sponsor, dan partner"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Sumber Logo</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={payload.source || "mixed"}
              onChange={(e) => update("source", e.target.value)}
            >
              <option value="mixed">Logo paid tenant + custom upload</option>
              <option value="paid_participants">Hanya tenant yang invoice-nya paid</option>
              <option value="custom">Hanya custom upload</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Tambah Logo Custom</Label>
            <MediaPicker
              value={null}
              onChange={(asset: MediaPickerValue) => {
                if (!asset?.id) return;
                update("customLogos", [
                  ...customLogos,
                  {
                    id: asset.id,
                    url: asset.url,
                    fileName: asset.fileName,
                    label: asset.fileName.replace(/\.[^/.]+$/, ""),
                  },
                ]);
              }}
              accept="image"
              folder={`public/events/${eventSlug}/pages/landing/logo-slider`}
              visibility="public"
              placeholder="Upload atau pilih logo sponsor/partner..."
            />
          </div>

          {customLogos.length > 0 ? (
            <div className="space-y-3">
              <Label>Logo Custom</Label>
              {customLogos.map((logo: any, index: number) => (
                <div key={`${logo.id}-${index}`} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
                  <img src={logo.url || `/api/media/${logo.id}`} alt={logo.label || "Logo"} className="h-10 w-16 rounded-lg border border-border object-contain" />
                  <Input
                    value={logo.label || ""}
                    onChange={(e) => {
                      const nextLogos = [...customLogos];
                      nextLogos[index] = { ...nextLogos[index], label: e.target.value };
                      update("customLogos", nextLogos);
                    }}
                    placeholder="Label logo"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => update("customLogos", customLogos.filter((_: any, i: number) => i !== index))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );

    case "faq":
      const faqs = payload.faqs || [];
      return (
        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Tanya Jawab (FAQ)</Label>
            {faqs.map((faq: any, index: number) => (
              <div key={index} className="flex gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex-1 space-y-3">
                  <Input 
                    value={faq.question || ""} 
                    onChange={(e) => {
                      const newFaqs = [...faqs];
                      newFaqs[index] = { ...newFaqs[index], question: e.target.value };
                      update("faqs", newFaqs);
                    }} 
                    placeholder="Pertanyaan?"
                  />
                  <textarea
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={faq.answer || ""}
                    onChange={(e) => {
                      const newFaqs = [...faqs];
                      newFaqs[index] = { ...newFaqs[index], answer: e.target.value };
                      update("faqs", newFaqs);
                    }}
                    placeholder="Jawaban..."
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive self-start"
                  onClick={() => update("faqs", faqs.filter((_: any, i: number) => i !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-dashed gap-2"
              onClick={() => update("faqs", [...faqs, { question: "", answer: "" }])}
            >
              <Plus className="size-4" />
              Tambah FAQ
            </Button>
          </div>
        </div>
      );

    case "agenda_preview":
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Judul (Title)</Label>
            <Input 
              value={payload.title || "Agenda Acara"} 
              onChange={(e) => update("title", e.target.value)} 
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sumber Data</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={payload.mode || "manual"}
              onChange={(e) => update("mode", e.target.value)}
            >
              <option value="manual">Teks Manual</option>
              <option value="linked_agenda">Ambil dari Database Agenda</option>
            </select>
          </div>
          
          {(payload.mode || "manual") === "manual" ? (
            <div className="space-y-1.5">
              <Label>Teks Manual</Label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={payload.manual_text || ""}
                onChange={(e) => update("manual_text", e.target.value)}
                placeholder="Tulis jadwal agenda manual di sini..."
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Jumlah Agenda yang Ditampilkan</Label>
              <Input 
                type="number"
                min="1"
                max="20"
                value={payload.itemLimit || 5} 
                onChange={(e) => update("itemLimit", parseInt(e.target.value) || 5)} 
              />
              <p className="text-xs text-muted-foreground">Menampilkan agenda dengan status "Published".</p>
            </div>
          )}
        </div>
      );

    case "footer_info":
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Alamat (Address)</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={payload.address || ""}
              onChange={(e) => update("address", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input 
                type="email"
                value={payload.email || ""} 
                onChange={(e) => update("email", e.target.value)} 
                placeholder="halo@event.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor Telepon</Label>
              <Input 
                value={payload.phone || ""} 
                onChange={(e) => update("phone", e.target.value)} 
                placeholder="+62 812..."
              />
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          UI form untuk tipe block <strong>{type}</strong> belum tersedia. Menggunakan JSON Raw:
          <textarea
            className="mt-2 flex min-h-[150px] w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
            value={JSON.stringify(payload, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {}
            }}
          />
        </div>
      );
  }
}
