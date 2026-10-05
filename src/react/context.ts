'use client'

import { createContext, createElement, useContext, useEffect, useMemo, type ReactNode } from 'react'

import type { Typo } from '../index.ts'
import type { DomNode } from '../tree.ts'
import { fixerFor, type Settings } from './shared.ts'

/** Settings of the nearest provider, read by the JSX runtime of Client Components. */
export const TTRContext = createContext<Settings | null>(null)

export type TTRProviderProps = Settings & {
  children?: ReactNode
  /** Also fixes the whole page in the browser after hydration, and keeps it fixed. */
  auto?: boolean
}

/** Client side of `TTRProvider`. */
export function TTRClientProvider({ children, locale, locales, auto = false }: TTRProviderProps) {
  const key = JSON.stringify(locales ?? null)
  const settings = useMemo<Settings>(() => ({ locale, locales }), [locale, key])
  useEffect(() => {
    if (!auto) return
    const body = (globalThis as { document?: { body: DomNode } }).document?.body
    return fixerFor(settings).watch(body)
  }, [auto, settings])
  return createElement(TTRContext.Provider, { value: settings }, children)
}

/** The fixer of the nearest `TTRProvider`, for text the JSX runtime does not see (attributes, metadata). */
export const useTTR = (): Typo => fixerFor(useContext(TTRContext) ?? undefined)
