import type { Block } from "@/components/admin/pages/BlockEditor";
import {
  HeroBlock,
  ProblemStatementBlock,
  HighlightCardsBlock,
  MomentumBannerBlock,
  AgendaPreviewBlock,
  LogoSliderBlock,
  TenantZonesBlock,
  CtaBannerBlock,
  TenantCtaBlock,
  FaqBlock,
  FooterInfoBlock,
  ImageBannerBlock,
  GalleryBlock,
  VideoEmbedBlock,
  EventInfoBlock,
  FunFactsBlock,
} from "./blocks";

const BLOCK_REGISTRY: Record<string, React.FC<any>> = {
  hero: HeroBlock,
  problem_statement: ProblemStatementBlock,
  highlight_cards: HighlightCardsBlock,
  momentum_banner: MomentumBannerBlock,
  agenda_preview: AgendaPreviewBlock,
  logo_slider: LogoSliderBlock,
  tenant_zones: TenantZonesBlock,
  cta_banner: CtaBannerBlock,
  tenant_cta: TenantCtaBlock,
  faq: FaqBlock,
  footer_info: FooterInfoBlock,
  image_banner: ImageBannerBlock,
  gallery: GalleryBlock,
  video_embed: VideoEmbedBlock,
  event_info: EventInfoBlock,
  fun_facts: FunFactsBlock,
};

export function LandingRenderer({ blocks, event }: { blocks: Block[], event: any }) {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return null;
  }

  const visibleBlocks = blocks
    .filter((b) => b.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const hasVisibleAgendaBlock = visibleBlocks.some((block) => block.type === "agenda_preview");

  return (
    <div className="flex flex-col">
      {visibleBlocks.map((block, index) => {
        const Component = BLOCK_REGISTRY[block.type];
        
        // Unknown block -> skip
        if (!Component) {
          return null;
        }

        try {
          return (
            <Component
              key={block.id}
              payload={block.payload}
              event={event}
              isFirst={index === 0}
              hasVisibleAgendaBlock={hasVisibleAgendaBlock}
            />
          );
        } catch (err) {
          // invalid payload / error during render -> fallback section kosong
          console.error(`Failed to render block ${block.type} (${block.id}):`, err);
          return null;
        }
      })}
    </div>
  );
}
