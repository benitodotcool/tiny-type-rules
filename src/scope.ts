/** Inline elements: text on both sides is fixed as one run. Any other element ends the run. */
export const INLINE = new Set(
  'a abbr b bdi bdo cite data del dfn em font i ins mark q s small span strong sub sup time u wbr'.split(' '),
)
/** Elements whose content is never fixed, unless they carry `data-ttr`. */
export const SKIP = new Set('code kbd math pre samp script style svg textarea tt var'.split(' '))

export type Scope = { name: string; depth: number; skip: boolean; locale: string | undefined }

export type FixParts = (parts: readonly string[], locale: string) => string[] | undefined

/** The scope an element opens, or undefined when it shares its parent's. */
export function enter(name: string, attr: (name: string) => string | null, top: Scope): Scope | undefined {
  const lang = attr('data-ttr-lang') ?? attr('lang')
  const prevent = attr('data-prevent-ttr') !== null
  const enable = attr('data-ttr') !== null
  if (lang === null && !prevent && !enable && !SKIP.has(name)) return undefined
  const skip = enable ? false : prevent || top.skip || SKIP.has(name)
  return { name, depth: 0, skip, locale: lang ?? top.locale }
}
