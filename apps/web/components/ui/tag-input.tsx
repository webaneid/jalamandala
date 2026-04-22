"use client"

import * as React from "react"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  dedupeCatalogValues,
  normalizeCatalogValue,
} from "@/lib/registration-catalog"

type TagInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange"
> & {
  values: string[]
  onValuesChange: (values: string[]) => void
  suggestions?: readonly string[]
  onCommitOption?: (value: string) => void
}

const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
  (
    {
      values,
      onValuesChange,
      suggestions = [],
      onCommitOption,
      onBlur,
      placeholder,
      ...props
    },
    ref
  ) => {
    const [draft, setDraft] = React.useState("")
    const listId = React.useId()

    function addTag(rawValue: string) {
      const normalized = normalizeCatalogValue(rawValue)

      if (!normalized) {
        return
      }

      const nextValues = dedupeCatalogValues([...values, normalized])
      onValuesChange(nextValues)
      onCommitOption?.(normalized)
      setDraft("")
    }

    function removeTag(tag: string) {
      onValuesChange(values.filter((value) => value !== tag))
    }

    return (
      <div className="space-y-3">
        {values.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {values.map((tag) => (
              <Badge
                key={tag}
                className="gap-1 rounded-full bg-primary-50 px-3 py-1 text-primary-700 ring-1 ring-primary-100"
              >
                <span>{tag}</span>
                <button
                  className="inline-flex size-4 items-center justify-center rounded-full text-primary-700/80 transition hover:bg-primary-100 hover:text-primary-900"
                  onClick={() => removeTag(tag)}
                  type="button"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}

        <Input
          {...props}
          ref={ref}
          list={suggestions.length > 0 ? listId : undefined}
          placeholder={placeholder}
          value={draft}
          onBlur={(event) => {
            if (draft.trim()) {
              addTag(draft)
            }
            onBlur?.(event)
          }}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault()
              addTag(draft)
            }

            if (event.key === "Backspace" && !draft && values.length > 0) {
              removeTag(values[values.length - 1]!)
            }
          }}
        />

        {suggestions.length > 0 ? (
          <datalist id={listId}>
            {suggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        ) : null}
      </div>
    )
  }
)

TagInput.displayName = "TagInput"

export { TagInput }
