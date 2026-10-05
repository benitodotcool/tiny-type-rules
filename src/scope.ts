/** Inline elements: text on both sides is fixed as one run. Any other element ends the run. */
export const INLINE = new Set(
  'a abbr b bdi bdo cite code data del dfn em font i ins kbd mark q s samp small span strong sub sup time tt u var wbr'.split(
    ' ',
  ),
)
/** Elements whose content is never fixed, unless they carry `data-ttr`. */
export const SKIP = new Set('code kbd math pre samp script style svg template textarea tt var'.split(' '))

/** Stands for content the rules must see around but never change: inline code, unknown entities. */
export const OPAQUE = '￼'

export type Scope = { name: string; depth: number; skip: boolean; locale: string | undefined }

/** Fixes pieces of one text; `before` and `after` are read-only context. Undefined: unsupported locale. */
export type FixParts = (
  parts: readonly string[],
  locale: string | undefined,
  before?: string,
  after?: string,
) => string[] | undefined

/** The scope an element opens, or undefined when it shares its parent's. */
export function enter(name: string, attr: (name: string) => string | null, top: Scope): Scope | undefined {
  const lang = attr('data-ttr-lang') ?? attr('lang')
  const prevent = attr('data-ttr-prevent') !== null
  const enable = attr('data-ttr') !== null
  if (lang === null && !prevent && !enable && !SKIP.has(name)) return undefined
  const skip = enable ? false : prevent || top.skip || SKIP.has(name)
  return { name, depth: 0, skip, locale: lang ?? top.locale }
}
