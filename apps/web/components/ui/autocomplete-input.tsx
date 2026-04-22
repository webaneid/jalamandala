"use client"

import * as React from "react"
import { Check, ChevronDown, Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type AutocompleteInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange"
> & {
  value: string
  onValueChange: (value: string) => void
  options: readonly string[]
  onCommitOption?: (value: string) => void
}

const MAX_OPTIONS = 8

const AutocompleteInput = React.forwardRef<HTMLInputElement, AutocompleteInputProps>(
  (
    {
      value,
      onValueChange,
      options,
      onBlur,
      onCommitOption,
      onFocus,
      onKeyDown,
      placeholder,
      className,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [activeIndex, setActiveIndex] = React.useState(-1)

    const filteredOptions = React.useMemo(() => {
      const query = value.trim().toLocaleLowerCase("id-ID")

      if (!query) {
        return options.slice(0, MAX_OPTIONS)
      }

      const startsWith = options.filter((option) =>
        option.toLocaleLowerCase("id-ID").startsWith(query)
      )
      const includes = options.filter((option) => {
        const normalized = option.toLocaleLowerCase("id-ID")
        return normalized.includes(query) && !normalized.startsWith(query)
      })

      return [...startsWith, ...includes].slice(0, MAX_OPTIONS)
    }, [options, value])

    React.useEffect(() => {
      if (filteredOptions.length === 0) {
        setActiveIndex(-1)
        return
      }

      setActiveIndex((current) => {
        if (current < 0) {
          return 0
        }

        return Math.min(current, filteredOptions.length - 1)
      })
    }, [filteredOptions])

    function commitValue(nextValue: string) {
      const normalized = nextValue.trim()
      onValueChange(normalized)
      onCommitOption?.(normalized)
    }

    function selectOption(option: string) {
      commitValue(option)
      setIsOpen(false)
    }

    return (
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          {...props}
          ref={ref}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          className={cn("h-11 rounded-2xl pr-11 pl-9", className)}
          onChange={(event) => {
            onValueChange(event.target.value)
            setIsOpen(true)
          }}
          onFocus={(event) => {
            setIsOpen(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            window.setTimeout(() => {
              setIsOpen(false)
            }, 120)
            commitValue(value)
            onBlur?.(event)
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              setIsOpen(true)
              setActiveIndex((current) =>
                filteredOptions.length === 0
                  ? -1
                  : current >= filteredOptions.length - 1
                    ? 0
                    : current + 1
              )
            }

            if (event.key === "ArrowUp") {
              event.preventDefault()
              setIsOpen(true)
              setActiveIndex((current) =>
                filteredOptions.length === 0
                  ? -1
                  : current <= 0
                    ? filteredOptions.length - 1
                    : current - 1
              )
            }

            if (event.key === "Enter" && isOpen && activeIndex >= 0 && filteredOptions[activeIndex]) {
              event.preventDefault()
              selectOption(filteredOptions[activeIndex])
            }

            if (event.key === "Escape") {
              setIsOpen(false)
            }

            onKeyDown?.(event)
          }}
        />
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 z-10 size-4 -translate-y-1/2 text-muted-foreground/70" />

        {isOpen && (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border/80 bg-white/98 shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur-sm">
            {filteredOptions.length > 0 ? (
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredOptions.map((option, index) => {
                  const isSelected = option.toLocaleLowerCase("id-ID") === value.trim().toLocaleLowerCase("id-ID")
                  const isActive = index === activeIndex

                  return (
                    <button
                      key={option}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                        isActive ? "bg-primary-50 text-primary-900" : "text-foreground hover:bg-muted/60",
                        isSelected && "font-medium"
                      )}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        selectOption(option)
                      }}
                    >
                      <span className="truncate">{option}</span>
                      {isSelected ? <Check className="size-4 text-primary-700" /> : null}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                Tidak ada hasil. Tekan `Tab` atau pindah fokus untuk memakai teks yang diketik.
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
)

AutocompleteInput.displayName = "AutocompleteInput"

export { AutocompleteInput }
