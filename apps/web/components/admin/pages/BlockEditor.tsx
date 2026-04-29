"use client";

import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlockForm } from "./BlockForm";

export type Block = {
  id: string;
  type: string;
  sortOrder: number;
  isVisible: boolean;
  payload: any;
};

const BLOCK_TYPES = [
  { value: "hero", label: "Hero Banner" },
  { value: "highlight_cards", label: "Highlight Cards" },
  { value: "momentum_banner", label: "Momentum Banner" },
  { value: "agenda_preview", label: "Agenda Preview" },
  { value: "logo_slider", label: "Logo Slider" },
  { value: "tenant_zones", label: "Tenant Zones" },
  { value: "cta_banner", label: "CTA Banner" },
  { value: "tenant_cta", label: "Tenant CTA" },
  { value: "faq", label: "FAQ" },
  { value: "footer_info", label: "Footer Info" },
  { value: "image_banner", label: "Image Banner (Full Width)" },
  { value: "gallery", label: "Gallery (3 Kolom)" },
  { value: "video_embed", label: "Video YouTube" },
  { value: "event_info", label: "Info Acara (Tanggal & Lokasi)" },
  { value: "fun_facts", label: "Fun Facts (Statistik Angka)" },
];

export function BlockEditor({
  blocks = [],
  eventSlug,
  onChange,
}: {
  blocks: Block[];
  eventSlug: string;
  onChange: (blocks: Block[]) => void;
}) {
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  function addBlock(type: string) {
    const newBlock: Block = {
      id: `block-${Math.random().toString(36).substring(2, 9)}`,
      type,
      sortOrder: blocks.length * 10,
      isVisible: true,
      payload: {},
    };
    const newBlocks = [...blocks, newBlock];
    onChange(newBlocks);
    setExpandedBlockId(newBlock.id);
  }

  function updateBlock(id: string, updates: Partial<Block>) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }

  function moveBlockUp(index: number) {
    if (index === 0) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index - 1]!;
    newBlocks[index - 1] = newBlocks[index]!;
    newBlocks[index] = temp;
    // update sortOrder
    newBlocks.forEach((b, i) => { b.sortOrder = i * 10; });
    onChange(newBlocks);
  }

  function moveBlockDown(index: number) {
    if (index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index + 1]!;
    newBlocks[index + 1] = newBlocks[index]!;
    newBlocks[index] = temp;
    // update sortOrder
    newBlocks.forEach((b, i) => { b.sortOrder = i * 10; });
    onChange(newBlocks);
  }

  return (
    <div className="space-y-4">
      {blocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-slate-50/50 p-8 text-center text-muted-foreground">
          Belum ada block di landing page ini.
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block, index) => {
            const blockLabel = BLOCK_TYPES.find((t) => t.value === block.type)?.label || block.type;
            const isExpanded = expandedBlockId === block.id;

            return (
              <div key={block.id} className="rounded-2xl border border-border/80 bg-white shadow-sm overflow-hidden transition-all">
                <div className="flex items-center gap-3 p-3 bg-slate-50/50 border-b border-border/40">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => moveBlockUp(index)} disabled={index === 0} type="button">
                      <ChevronUp className="size-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => moveBlockDown(index)} disabled={index === blocks.length - 1} type="button">
                      <ChevronDown className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <p className="font-semibold text-sm truncate">{blockLabel}</p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => updateBlock(block.id, { isVisible: !block.isVisible })}
                        type="button"
                      >
                        {block.isVisible ? <Eye className="size-4" /> : <EyeOff className="size-4 text-muted-foreground" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:bg-destructive/10"
                        onClick={() => removeBlock(block.id)}
                        type="button"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                        type="button"
                      >
                        {isExpanded ? "Tutup" : "Edit"}
                      </Button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 space-y-4 border-t border-border/40">
                    <BlockForm 
                      type={block.type}
                      payload={block.payload} 
                      eventSlug={eventSlug}
                      onChange={(payload) => updateBlock(block.id, { payload })} 
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        {BLOCK_TYPES.map((type) => (
          <Button
            key={type.value}
            size="sm"
            onClick={() => addBlock(type.value)}
            className="rounded-xl gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            type="button"
          >
            <Plus className="size-3.5" />
            {type.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
