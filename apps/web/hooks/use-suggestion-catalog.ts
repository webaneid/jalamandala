"use client"

import * as React from "react"

import {
  dedupeCatalogValues,
  normalizeCatalogValue,
} from "@/lib/registration-catalog"

export function useSuggestionCatalog(key: string, seededOptions: readonly string[]) {
  const storageKey = `jalamandala.catalog.${key}`
  const normalizedSeededOptions = React.useMemo(
    () => dedupeCatalogValues(seededOptions),
    [seededOptions]
  )
  const seededSignature = React.useMemo(
    () => normalizedSeededOptions.join("\u0000"),
    [normalizedSeededOptions]
  )
  const [options, setOptions] = React.useState(() => normalizedSeededOptions)

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const stored = window.localStorage.getItem(storageKey)

    if (!stored) {
      setOptions((current) => {
        const next = normalizedSeededOptions
        if (current.length === next.length && current.every((v, i) => v === next[i])) {
          return current
        }
        return next
      })
      return
    }

    try {
      const parsed = JSON.parse(stored)

      if (!Array.isArray(parsed)) {
        setOptions((current) => {
          const next = normalizedSeededOptions
          if (current.length === next.length && current.every((v, i) => v === next[i])) {
            return current
          }
          return next
        })
        return
      }

      setOptions((current) => {
        const next = dedupeCatalogValues([...normalizedSeededOptions, ...parsed])
        if (current.length === next.length && current.every((v, i) => v === next[i])) {
          return current
        }
        return next
      })
    } catch {
      setOptions((current) => {
        const next = normalizedSeededOptions
        if (current.length === next.length && current.every((v, i) => v === next[i])) {
          return current
        }
        return next
      })
    }
  }, [normalizedSeededOptions, seededSignature, storageKey])

  function persist(nextOptions: string[]) {
    if (typeof window === "undefined") {
      return
    }

    const userDefined = nextOptions.filter(
      (option) =>
        !normalizedSeededOptions.some(
          (seeded) =>
            seeded.toLocaleLowerCase("id-ID") === option.toLocaleLowerCase("id-ID")
        )
    )

    window.localStorage.setItem(storageKey, JSON.stringify(userDefined))
  }

  function registerOption(value: string) {
    const normalized = normalizeCatalogValue(value)

    if (!normalized) {
      return
    }

    setOptions((currentOptions) => {
      const nextOptions = dedupeCatalogValues([...currentOptions, normalized])
      persist(nextOptions)
      return nextOptions
    })
  }

  function registerOptions(values: readonly string[]) {
    const normalizedValues = dedupeCatalogValues(values)

    if (normalizedValues.length === 0) {
      return
    }

    setOptions((currentOptions) => {
      const nextOptions = dedupeCatalogValues([...currentOptions, ...normalizedValues])
      persist(nextOptions)
      return nextOptions
    })
  }

  return {
    options,
    registerOption,
    registerOptions,
  }
}
