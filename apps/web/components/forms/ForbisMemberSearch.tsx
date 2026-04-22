"use client";

import * as React from "react";
import { Check, Search, UserCheck, UserX } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ForbisMemberOption } from "@/lib/forbis-members";

type ForbisMemberSearchProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  onSelect: (member: ForbisMemberOption) => void;
  placeholder?: string;
  value: string;
};

export function ForbisMemberSearch({
  disabled,
  onChange,
  onSelect,
  placeholder = "Ketik nama untuk cari anggota FORBIS",
  value,
}: ForbisMemberSearchProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [members, setMembers] = React.useState<ForbisMemberOption[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (value.trim()) params.set("q", value.trim());

        const response = await fetch(`/api/forbis-members?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) { setMembers([]); return; }

        const payload = (await response.json()) as { members?: ForbisMemberOption[] };
        setMembers(payload.members ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setMembers([]);
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [value]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground/70" />
      <input
        autoComplete="off"
        className="h-11 w-full rounded-2xl border border-input bg-background px-3 pl-9 pr-9 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onBlur={() => { window.setTimeout(() => setIsOpen(false), 150); }}
        onChange={(e) => {
          setSelectedId(null);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        value={value}
      />

      {selectedId && (
        <UserCheck className="pointer-events-none absolute top-1/2 right-3 z-10 size-4 -translate-y-1/2 text-emerald-500" />
      )}

      {isOpen && !disabled && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border/80 bg-white/98 shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur-sm">
          {members.length > 0 ? (
            <div className="max-h-72 overflow-y-auto p-2">
              {members.map((member) => {
                const isSelected = member.id === selectedId;
                return (
                  <button
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      member.isRegistered
                        ? "cursor-not-allowed opacity-60"
                        : isSelected
                          ? "bg-primary-50 font-medium text-primary-900"
                          : "text-foreground hover:bg-muted/60"
                    )}
                    disabled={member.isRegistered}
                    key={member.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (member.isRegistered) return;
                      setSelectedId(member.id);
                      onChange(member.name);
                      onSelect(member);
                      setIsOpen(false);
                    }}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{member.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {[member.forbisMemberId, member.companyName, member.phone]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {member.isRegistered ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                        <UserX className="size-3" />
                        Terdaftar
                      </span>
                    ) : isSelected ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-primary-700" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              {isLoading
                ? "Memuat..."
                : value.trim()
                  ? "Tidak ada anggota yang cocok. Isi manual di bawah."
                  : "Ketik nama untuk mencari anggota FORBIS."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
