"use client";

import * as React from "react";

import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { cn } from "@/lib/utils";

export type AutocompleteSelectOption = {
  label: string;
  value: string;
};

type AutocompleteSelectProps = {
  id?: string;
  value: string;
  options: readonly AutocompleteSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onValueChange: (value: string) => void;
  onOptionSelect?: (option: AutocompleteSelectOption | null) => void;
};

export function AutocompleteSelect({
  id,
  value,
  options,
  placeholder,
  disabled,
  className,
  onValueChange,
  onOptionSelect,
}: AutocompleteSelectProps) {
  const labelMap = React.useMemo(() => {
    return new Map(options.map((option) => [option.label, option] as const));
  }, [options]);

  const selectedLabel = React.useMemo(() => {
    return options.find((option) => option.value === value)?.label ?? value;
  }, [options, value]);

  return (
    <AutocompleteInput
      id={id}
      value={selectedLabel}
      options={options.map((option) => option.label)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn("h-11 rounded-2xl border-border bg-white", className)}
      onValueChange={(nextLabel) => {
        const matched = labelMap.get(nextLabel.trim()) ?? null;
        onValueChange(matched?.value ?? nextLabel);
        onOptionSelect?.(matched);
      }}
      onCommitOption={(committedLabel) => {
        const matched = labelMap.get(committedLabel.trim()) ?? null;
        onValueChange(matched?.value ?? committedLabel);
        onOptionSelect?.(matched);
      }}
    />
  );
}
