'use client'

import { createContext, createElement, useContext, useEffect, useMemo, type ReactNode } from 'react'

import { createTypo, type Typo as Fixer, type TypoOptions } from '../index.ts'
import type { DomNode } from '../tree.ts'

const builtIn = createTypo()
const Context = createContext<Fixer | null>(null)

export type TypoProviderProps = TypoOptions & {
  children?: ReactNode
  /** Also fixes the whole page in the browser after hydration, and keeps it fixed. */
  auto?: boolean
}

/** Shares your settings with client components and, with `auto`, fixes the whole page. */
export function TypoProvider({ children, locale, locales, auto = false }: TypoProviderProps) {
  const key = JSON.stringify(locales ?? null)
  const typo = useMemo(() => createTypo({ locale, locales }), [locale, key])
  useEffect(() => {
    if (!auto) return
    const body = (globalThis as { document?: { body: DomNode } }).document?.body
    return typo.watch(body)
  }, [auto, typo])
  return createElement(Context.Provider, { value: typo }, children)
}

/** The fixer of the nearest `TypoProvider`, else the built-in one. Client components only. */
export const useTypo = (): Fixer => useContext(Context) ?? builtIn
