import { compile, Run, type LocaleConfig } from './engine.ts'
import { fixHtmlWith } from './html.ts'
import { OPAQUE, type FixParts } from './scope.ts'
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
  element(root: DomNode | null | undefined, locale?: string): void
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

const normalize = (tag: string) => tag.trim().toLowerCase().replaceAll('_', '-')

/** RFC 4647 lookup: `fr-ca-u-nu-latn`, then `fr-ca-u-nu`... down to `fr`. */
function lookup<T>(map: Map<string, T>, tag: string): T | undefined {
  for (;;) {
    const found = map.get(tag)
    if (found || !tag.includes('-')) return found
    tag = tag.slice(0, tag.lastIndexOf('-'))
  }
}

const defined = (config: LocaleConfig) => Object.fromEntries(Object.entries(config).filter(([, v]) => v !== undefined))

const merge = (base: LocaleConfig = {}, over: LocaleConfig): LocaleConfig => ({
  ...base,
  ...defined(over),
  spaceBefore: { ...base.spaceBefore, ...over.spaceBefore },
  replacements: { ...base.replacements, ...over.replacements },
})

/** Creates a fixer with your own settings. */
export function createTypo(options: TypoOptions = {}): Typo {
  const configs = new Map(Object.entries(BUILT_IN))
  const custom = Object.entries(options.locales ?? {}).map(([tag, config]) => [normalize(tag), config] as const)
  // Languages before regions, so `fr-CH` extends the customized `fr`.
  custom.sort(([a], [b]) => a.split('-').length - b.split('-').length)
  for (const [tag, config] of custom) configs.set(tag, merge(lookup(configs, tag), config))

  const compiled = new Map([...configs].map(([tag, config]) => [tag, compile(config)]))

  const fix: FixParts = (parts, locale, before = '', after = '') => {
    const apply = typeof locale === 'string' ? lookup(compiled, normalize(locale)) : undefined
    if (!apply) return undefined
    const all = [before, ...parts, after]
    const marks: number[] = []
    let at = 0
    for (const part of all.slice(0, -1)) marks.push((at += part.length))
    const run = new Run(all.join(''), marks)
    apply(run)
    return parts.map((_, i) => run.text.slice(run.marks[i], run.marks[i + 1]))
  }

  return {
    text: (text, locale) => (typeof text === 'string' ? (fix([text], locale)?.[0] ?? text) : text),
    parts: (parts, locale) => {
      if (!Array.isArray(parts) || !parts.length) return parts as never
      const fixed = fix(parts.map((p) => (typeof p === 'string' ? p : OPAQUE)), locale)
      return parts.map((p, i) => (typeof p === 'string' && fixed ? fixed[i]! : p))
    },
    html: (html, locale) => (typeof html === 'string' ? fixHtmlWith(fix, html, locale) : html),
    portableText: (blocks, locale) =>
      !Array.isArray(blocks)
        ? (blocks as never)
        : blocks.map((block) => {
            const { _type, children } = (block ?? {}) as { _type?: unknown; children?: unknown }
            if (_type !== 'block' || !Array.isArray(children)) return block
            // Code spans and inline objects stay as they are, but the rules see a word there.
            const isText = (c: Span) => c?._type === 'span' && typeof c.text === 'string' && !isCode(c)
            const fixed = fix(
              children.map((c: Span) => (isText(c) ? (c.text as string) : OPAQUE)),
              locale,
            )
            if (!fixed || children.every((c: Span, i) => !isText(c) || c.text === fixed[i])) return block
            return {
              ...block,
              children: children.map((c: Span, i) => (isText(c) && c.text !== fixed[i] ? { ...c, text: fixed[i] } : c)),
            }
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
