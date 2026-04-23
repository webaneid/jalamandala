"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FormSelectOption = {
  id: string;
  label: string;
  slug?: string;
};

type OptionAutocompleteSelectProps = {
  disabled?: boolean;
  onBlur?: () => void;
  onValueChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder: string;
  value: string;
  variant?: "default" | "dark";
};

export function OptionAutocompleteSelect({
  disabled,
  onBlur,
  onValueChange,
  options,
  placeholder,
  value,
  variant = "default",
}: OptionAutocompleteSelectProps) {
  const isDark = variant === "dark";
  const selectedOption = options.find((option) => option.id === value) ?? null;
  const [inputValue, setInputValue] = React.useState(selectedOption?.label ?? "");
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    setInputValue(selectedOption?.label ?? "");
  }, [selectedOption?.label]);

  const filteredOptions = React.useMemo(() => {
    const query = inputValue.trim().toLocaleLowerCase("id-ID");

    if (!query) {
      return options.slice(0, 10);
    }

    return options
      .filter((option) => {
        const label = option.label.toLocaleLowerCase("id-ID");
        const slug = option.slug?.toLocaleLowerCase("id-ID") ?? "";

        return label.includes(query) || slug.includes(query);
      })
      .slice(0, 10);
  }, [inputValue, options]);

  function selectOption(option: FormSelectOption) {
    setInputValue(option.label);
    onValueChange(option.id);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground/70" />
      <Input
        autoComplete="off"
        className={cn("h-11 rounded-2xl pr-11 pl-9", isDark && "border-white/12 bg-white/8 text-white placeholder:text-white/30")}
        disabled={disabled}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120);
          if (!selectedOption || inputValue.trim() !== selectedOption.label) {
            setInputValue(selectedOption?.label ?? "");
          }
          onBlur?.();
        }}
        onChange={(event) => {
          setInputValue(event.target.value);
          setIsOpen(true);
          if (value) {
            onValueChange("");
          }
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        value={inputValue}
      />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 z-10 size-4 -translate-y-1/2 text-muted-foreground/70" />

      {isOpen && !disabled ? (
        <div className={cn(
          "absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border shadow-[0_24px_60px_rgba(15,23,42,0.24)] backdrop-blur-sm",
          isDark
            ? "border-white/12 bg-[#0d2451]/95"
            : "border-border/80 bg-white/98"
        )}>
          {filteredOptions.length > 0 ? (
            <div className="max-h-72 overflow-y-auto p-2">
              {filteredOptions.map((option) => {
                const isSelected = option.id === value;

                return (
                  <button
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      isDark
                        ? isSelected
                          ? "bg-white/12 font-medium text-white"
                          : "text-white/70 hover:bg-white/8 hover:text-white"
                        : isSelected
                          ? "bg-primary-50 font-medium text-primary-900"
                          : "text-foreground hover:bg-muted/60"
                    )}
                    key={option.id}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectOption(option);
                    }}
                    type="button"
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? <Check className="size-4 text-primary-700" /> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={cn("px-4 py-3 text-sm", isDark ? "text-white/40" : "text-muted-foreground")}>
              Tidak ada opsi yang cocok.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
