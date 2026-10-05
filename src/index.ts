import { compile, Run, type LocaleConfig } from './engine.ts'
import { fixHtmlWith } from './html.ts'
import { fixDomWith, fixHastWith, type DomNode, type HastNode } from './tree.ts'
import { en } from './locales/en.ts'
import { fr } from './locales/fr.ts'

export { FIGURE_SPACE, HAIR_SPACE, NBSP, NNBSP, THIN_SPACE, UNITS } from './chars.ts'
export type { DomNode, HastNode, LocaleConfig }
export { en, fr }

export interface TypoOptions {
  /**
   * Settings per BCP 47 tag, merged over the built-in config of the tag or of its language
   * (`fr-CH` starts from `fr`). An unknown tag adds a language.
   */
  locales?: Readonly<Record<string, LocaleConfig>>
}

export interface Typo {
  /** Fixes a plain string. An unsupported locale returns it unchanged. */
  text(text: string, locale: string): string
  /**
   * Fixes text split into pieces (rich text spans, Portable Text children) as one string,
   * so rules see across piece boundaries. Returns as many pieces as it was given.
   */
  parts(parts: readonly string[], locale: string): string[]
  /**
   * Fixes the text of an HTML string, leaving markup, code and attributes untouched.
   * `data-ttr-lang`, then the nearest `lang` attribute, win over `locale`.
   */
  html(html: string, locale?: string): string
  /**
   * Fixes Portable Text blocks (Sanity), span text only. Returns new blocks, leaves the input alone.
   * Spans marked `code` and blocks of any other `_type` are left untouched.
   */
  portableText<T>(blocks: readonly T[], locale: string): T[]
  /**
   * Fixes the text nodes of a live DOM element in place, browser side. Ancestors count:
   * their `lang` and `data-*` attributes apply as in `html`.
   */
  element(root: DomNode, locale?: string): void
  /** Fixes a hast tree (rehype, MDX) in place, with the same rules as `html`. */
  hast(tree: HastNode, locale?: string): void
}

interface Span {
  _type?: unknown
  text?: unknown
  marks?: unknown
}

const isCode = (span: Span) => Array.isArray(span.marks) && span.marks.includes('code')

const BUILT_IN: Record<string, LocaleConfig> = { fr, en }

const language = (tag: string) => tag.toLowerCase().split(/[-_]/)[0]!

const merge = (base: LocaleConfig = {}, over: LocaleConfig): LocaleConfig => ({
  ...base,
  ...over,
  spaceBefore: { ...base.spaceBefore, ...over.spaceBefore },
  replacements: { ...base.replacements, ...over.replacements },
})

/** Creates a fixer with your own settings. */
export function createTypo(options: TypoOptions = {}): Typo {
  const configs = new Map(Object.entries(BUILT_IN))
  const custom = Object.entries(options.locales ?? {}).map(([tag, config]) => [tag.toLowerCase().replaceAll('_', '-'), config] as const)
  // Languages before regions, so `fr-CH` extends the customized `fr`.
  custom.sort(([a], [b]) => a.split('-').length - b.split('-').length)
  for (const [tag, config] of custom) configs.set(tag, merge(configs.get(tag) ?? configs.get(language(tag)), config))

  const compiled = new Map([...configs].map(([tag, config]) => [tag, compile(config)]))
  const rules = (locale: string) => compiled.get(locale.toLowerCase().replaceAll('_', '-')) ?? compiled.get(language(locale))

  const fix = (parts: readonly string[], locale: string) => {
    const apply = rules(locale)
    if (!apply) return undefined
    const marks: number[] = []
    let at = 0
    for (const part of parts.slice(0, -1)) marks.push((at += part.length))
    const run = new Run(parts.join(''), marks)
    apply(run)
    return [0, ...run.marks].map((start, i) => run.text.slice(start, run.marks[i] ?? run.text.length))
  }

  return {
    text: (text, locale) => fix([text], locale)?.[0] ?? text,
    parts: (parts, locale) => (parts.length && fix(parts, locale)) || [...parts],
    html: (html, locale) => fixHtmlWith(fix, html, locale),
    portableText: (blocks, locale) =>
      blocks.map((block) => {
        const { _type, children } = (block ?? {}) as { _type?: unknown; children?: unknown }
        if (_type !== 'block' || !Array.isArray(children)) return block
        const fixed = new Map<Span, string>()
        let run: Span[] = []
        const flush = () => {
          if (run.length) fix(run.map((span) => span.text as string), locale)?.forEach((text, i) => fixed.set(run[i]!, text))
          run = []
        }
        for (const child of children as Span[]) {
          if (child?._type !== 'span' || typeof child.text !== 'string' || isCode(child)) flush()
          else run.push(child)
        }
        flush()
        return { ...block, children: children.map((child) => (fixed.has(child) ? { ...child, text: fixed.get(child) } : child)) }
      }),
    element: (root, locale) => fixDomWith(fix, root, locale),
    hast: (tree, locale) => fixHastWith(fix, tree, locale),
  }
}

const typo = createTypo()

/** Fixes a plain string with the built-in settings. An unsupported locale returns it unchanged. */
export const fixText = typo.text
/** Fixes rich text pieces as one string with the built-in settings. Returns as many pieces. */
export const fixParts = typo.parts
/** Fixes the text of an HTML string with the built-in settings. */
export const fixHtml = typo.html
/** Fixes Portable Text blocks with the built-in settings. */
export const fixPortableText = typo.portableText
/** Fixes a live DOM element in place with the built-in settings. */
export const fixElement = typo.element

/**
 * rehype plugin: `unified().use(rehypeTinyTypeRules, { locale: 'fr' })`.
 * Settings go in `locales` (serializable, for Turbopack) or in a ready-made `typo`.
 */
export function rehypeTinyTypeRules(options: { locale?: string; locales?: TypoOptions['locales']; typo?: Typo } = {}) {
  const fixer = options.typo ?? (options.locales ? createTypo({ locales: options.locales }) : typo)
  return (tree: HastNode): void => fixer.hast(tree, options.locale)
}
