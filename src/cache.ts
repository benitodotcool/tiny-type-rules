import type { Typo } from './index.ts'

// Frameworks render the same text again and again: remember the last results.
const results = new Map<string, string[]>()

/** `typo.parts`, memoized. */
export function cachedParts(typo: Typo, parts: string[], locale: string): string[] {
  const key = `${locale}\u0000${parts.join('\u0001')}`
  let fixed = results.get(key)
  if (!fixed) {
    if (results.size > 2000) results.clear()
    results.set(key, (fixed = typo.parts(parts, locale)))
  }
  return fixed
}

const portableTexts = new WeakMap<object, Map<string, unknown>>()

/** Portable Text fixed, memoized per array; any other value comes back as is. */
export function cachedValue(typo: Typo, value: unknown, locale: string): unknown {
  const isPortableText =
    Array.isArray(value) &&
    value.some((b) => (b as { _type?: unknown } | null)?._type === 'block' && Array.isArray((b as { children?: unknown }).children))
  if (!isPortableText) return value
  let cache = portableTexts.get(value)
  if (!cache) portableTexts.set(value, (cache = new Map()))
  if (!cache.has(locale)) cache.set(locale, typo.portableText(value, locale))
  return cache.get(locale)
}
