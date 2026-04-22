"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type RegionOption = {
  code: string;
  name: string;
};

type RegionAutocompleteSelectProps = {
  disabled?: boolean;
  level: "province" | "regency" | "district" | "village";
  onBlur?: () => void;
  onSelect: (region: RegionOption | null) => void;
  parentCode?: string;
  placeholder: string;
  valueCode: string;
  valueName: string;
};

export function RegionAutocompleteSelect({
  disabled,
  level,
  onBlur,
  onSelect,
  parentCode,
  placeholder,
  valueCode,
  valueName,
}: RegionAutocompleteSelectProps) {
  const [inputValue, setInputValue] = React.useState(valueName);
  const [isOpen, setIsOpen] = React.useState(false);
  const [options, setOptions] = React.useState<RegionOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setInputValue(valueName);
    }
  }, [isOpen, valueName]);

  React.useEffect(() => {
    if (disabled) {
      setOptions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({ level });
        const query = inputValue.trim();

        if (parentCode) {
          params.set("parentCode", parentCode);
        }

        if (query && query !== valueName) {
          params.set("q", query);
        }

        const response = await fetch(`/api/regions?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          setOptions([]);
          return;
        }

        const payload = (await response.json()) as { regions?: RegionOption[] };
        setOptions(payload.regions ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setOptions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [disabled, inputValue, level, parentCode, valueName]);

  function selectRegion(region: RegionOption) {
    setInputValue(region.name);
    onSelect(region);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground/70" />
      <Input
        autoComplete="off"
        className="h-11 rounded-2xl pr-11 pl-9"
        disabled={disabled}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120);
          if (valueCode && inputValue.trim() !== valueName) {
            setInputValue(valueName);
          }
          if (!valueCode) {
            setInputValue("");
          }
          onBlur?.();
        }}
        onChange={(event) => {
          setInputValue(event.target.value);
          setIsOpen(true);
          if (valueCode) {
            onSelect(null);
          }
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        value={inputValue}
      />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 z-10 size-4 -translate-y-1/2 text-muted-foreground/70" />

      {isOpen && !disabled ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border/80 bg-white/98 shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur-sm">
          {options.length > 0 ? (
            <div className="max-h-72 overflow-y-auto p-2">
              {options.map((option) => {
                const isSelected = option.code === valueCode;

                return (
                  <button
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-primary-50 font-medium text-primary-900"
                        : "text-foreground hover:bg-muted/60"
                    )}
                    key={option.code}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectRegion(option);
                    }}
                    type="button"
                  >
                    <span className="truncate">{option.name}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {option.code}
                    </span>
                    {isSelected ? <Check className="size-4 text-primary-700" /> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              {isLoading ? "Memuat data wilayah..." : "Tidak ada wilayah yang cocok."}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
