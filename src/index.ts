import { compile, Run, type LocaleConfig } from './engine.ts'
import { fixHtmlWith } from './html.ts'
import { en } from './locales/en.ts'
import { fr } from './locales/fr.ts'

export { HAIR_SPACE, NBSP, NNBSP, THIN_SPACE, UNITS } from './chars.ts'
export type { LocaleConfig }
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
}

const BUILT_IN: Record<string, LocaleConfig> = { fr, en }

const language = (tag: string) => tag.toLowerCase().split(/[-_]/)[0]!

const merge = (base: LocaleConfig = {}, over: LocaleConfig): LocaleConfig => ({
  ...base,
  ...over,
  spaceBefore: { ...base.spaceBefore, ...over.spaceBefore },
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
  }
}

const typo = createTypo()

/** Fixes a plain string with the built-in settings. An unsupported locale returns it unchanged. */
export const fixText = typo.text
/** Fixes rich text pieces as one string with the built-in settings. Returns as many pieces. */
export const fixParts = typo.parts
/** Fixes the text of an HTML string with the built-in settings. */
export const fixHtml = typo.html
