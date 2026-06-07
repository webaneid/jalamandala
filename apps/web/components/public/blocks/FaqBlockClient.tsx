"use client";

import * as React from "react";
import { ChevronDown, Search } from "lucide-react";

type FaqItem = { question: string; answer: string };

function FaqAnswerText({ text }: { text: string }) {
  return (
    <span>
      {text.split("\n").map((line, i, arr) => (
        <React.Fragment key={i}>
          {line}
          {i < arr.length - 1 && <br />}
        </React.Fragment>
      ))}
    </span>
  );
}

function FaqAccordionItem({ faq, isOpen, onToggle }: { faq: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/5 backdrop-blur-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold text-white">{faq.question}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-white/50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="border-t border-white/8 px-5 py-4">
          <p className="text-sm leading-6 text-white/60">
            <FaqAnswerText text={faq.answer} />
          </p>
        </div>
      )}
    </div>
  );
}

export function FaqBlockClient({
  faqs,
  eyebrow,
  title,
}: {
  faqs: FaqItem[];
  eyebrow: string | null;
  title: string;
}) {
  const [search, setSearch] = React.useState("");
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const filtered = search.trim()
    ? faqs.filter(
        (f) =>
          f.question.toLowerCase().includes(search.toLowerCase()) ||
          f.answer.toLowerCase().includes(search.toLowerCase())
      )
    : faqs;

  function toggle(idx: number) {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  }

  return (
    <section className="py-5 sm:py-14">
      <div className="mx-auto w-full max-w-[720px] px-5">
        <div className="mb-8 space-y-2">
          {eyebrow && (
            <span className="inline-block rounded-full border border-[#00adee]/30 bg-[#00adee]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#00adee]">
              {eyebrow}
            </span>
          )}
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpenIndex(null);
            }}
            placeholder="Cari pertanyaan..."
            className="h-11 w-full rounded-2xl border border-white/12 bg-white/8 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#00adee]/40 focus:bg-white/10"
          />
        </div>

        {/* FAQ list */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/40">
              Tidak ada pertanyaan yang cocok dengan &ldquo;{search}&rdquo;.
            </p>
          ) : (
            filtered.map((faq, idx) => (
              <FaqAccordionItem
                key={idx}
                faq={faq}
                isOpen={openIndex === idx}
                onToggle={() => toggle(idx)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
