import { createElement } from 'react'

import { TTRClientProvider, type TTRProviderProps } from './context.ts'
import { requestSettings } from './store.ts'

export type { TTRProviderProps } from './context.ts'
export type { Settings as TTRSettings } from './shared.ts'

/**
 * Sets the language and settings of the request for every text rendered below it,
 * in Server and Client Components. Put it once, in the root layout.
 */
export function TTRProvider({ children, locale, locales, auto }: TTRProviderProps) {
  requestSettings().current = { locale, locales }
  return createElement(TTRClientProvider, { locale, locales, auto }, children)
}
