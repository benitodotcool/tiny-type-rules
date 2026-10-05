/**
 * Typographic settings of one language. Every setting is optional:
 * a string replaces, `''` removes, `false` or a missing key leaves the text as typed.
 */
export interface LocaleConfig {
  /** Straight `"` become these, like the CSS `quotes` property: outer open, outer close, inner open, inner close. */
  quotes?: false | readonly [open: string, close: string, nestedOpen: string, nestedClose: string]
  /** Straight `'` used as quotation marks become these. When `false`, every `'` is an apostrophe. */
  singleQuotes?: false | readonly [open: string, close: string]
  /** Replaces `'` inside words (`it's`, `l'été`) and before decades (`'90s`). */
  apostrophe?: false | string
  /** Replaces three dots. */
  ellipsis?: false | string
  /** Space right inside the outer quotes, the French `« … »`. */
  spaceInsideQuotes?: false | string
  /** Space before each punctuation mark, keyed by the mark. Added when missing, normalized when present. */
  spaceBefore?: Readonly<Record<string, false | string>>
  /** Separator between groups of three digits typed with a space (`10 000`). */
  thousandsSeparator?: false | string
  /** Space between a number and one of `units`, replacing the typed space. */
  unitSpace?: false | string
  units?: readonly string[]
  /** Space after one of `abbreviations` when a word or a number follows (`M. Dupont`, `n° 5`). */
  abbreviationSpace?: false | string
  abbreviations?: readonly string[]
  /** Replaces a hyphen or a double hyphen typed between spaces (`a - b`, `a -- b`). */
  dash?: false | string
  /** Space before the last word of a paragraph, so that word never sits alone on its line. */
  widowSpace?: false | string
  /** Literal replacements applied before every other rule, such as `{ '(c)': '©' }`. */
  replacements?: Readonly<Record<string, string>>
}

type Replacer = string | ((match: RegExpMatchArray) => string)

/**
 * Text being fixed, plus the offsets where it was split (HTML tags, rich text spans).
 * Every replacement keeps the offsets in place, so the pieces can be split back apart.
 */
export class Run {
  text: string
  marks: number[]

  constructor(text: string, marks: number[]) {
    this.text = text
    this.marks = marks
  }

  replace(re: RegExp, rep: Replacer): void {
    const { text, marks } = this
    let out = ''
    let last = 0
    let i = 0
    for (const m of text.matchAll(re)) {
      const start = m.index
      const end = start + m[0].length
      const r = typeof rep === 'string' ? rep : rep(m)
      out += text.slice(last, start)
      const at = out.length
      while (i < marks.length && marks[i]! <= start) marks[i]! += at - start, i++
      // A mark inside the match keeps its distance from the match start, clamped to the replacement.
      while (i < marks.length && marks[i]! < end) marks[i] = at + Math.min(marks[i]! - start, r.length), i++
      out += r
      last = end
    }
    const shift = out.length - last
    while (i < marks.length) marks[i++]! += shift
    this.text = out + text.slice(last)
  }
}

// Horizontal spaces only: line breaks are never touched.
const S = '[ \\t\\u00A0\\u2000-\\u200A\\u202F\\u205F]'
const OPENERS = '\\s\\p{Ps}\\p{Pi}\\-\\u2013\\u2014/'
const AFTER_PUNCT = '(?=$|[\\s\\p{Pe}\\p{Pi}\\p{Pf}.,…;:!?"\'])'
const OPENING = new RegExp(`[${OPENERS}]`, 'u')

// Config strings enter regexes as code points, safe both inside and outside a class.
const esc = (s: string) => [...s].map((ch) => `\\u{${ch.codePointAt(0)!.toString(16)}}`).join('')
const isSet = (v: false | string | undefined): v is string => typeof v === 'string'
const isOpening = (m: RegExpMatchArray) => m.index === 0 || OPENING.test(m.input![m.index! - 1]!)

/** Turns a locale config into the function that applies it. */
export function compile(c: LocaleConfig): (run: Run) => void {
  const steps: ((run: Run) => void)[] = []
  const add = (re: RegExp, rep: Replacer) => steps.push((run) => run.replace(re, rep))
  const q = c.quotes || undefined
  const words = (list: readonly string[]) => [...list].sort((a, b) => b.length - a.length).map(esc).join('|')

  for (const [from, to] of Object.entries(c.replacements ?? {})) if (from) add(new RegExp(esc(from), 'gu'), to)

  if (isSet(c.apostrophe)) {
    add(/(?<=[\p{L}\p{N}])'(?=\p{L})/gu, c.apostrophe)
    add(/(?<=^|[\s(])'(?=\d\ds?\b)/g, c.apostrophe)
  }
  if (q || c.singleQuotes || isSet(c.apostrophe)) {
    const re = new RegExp(['"', "'", ...(q ? [q[0], q[1]] : [])].map(esc).join('|'), 'gu')
    steps.push((run) => {
      let depth = 0
      run.replace(re, (m) => {
        const ch = m[0]
        if (ch === "'") {
          if (c.singleQuotes) return c.singleQuotes[isOpening(m) ? 0 : 1]
          return isSet(c.apostrophe) ? c.apostrophe : ch
        }
        if (ch !== '"') return (depth = ch === q![0] ? depth + 1 : Math.max(0, depth - 1)), ch
        if (!q) return ch
        if (isOpening(m)) return q[depth++ ? 2 : 0]
        depth = Math.max(0, depth - 1)
        return q[depth ? 3 : 1]
      })
    })
  }
  if (q && isSet(c.spaceInsideQuotes)) {
    add(new RegExp(`${esc(q[0])}${S}*(?=\\S)`, 'gu'), q[0] + c.spaceInsideQuotes)
    add(new RegExp(`(?<=\\S)${S}*${esc(q[1])}`, 'gu'), c.spaceInsideQuotes + q[1])
  }
  const puncts = Object.keys(c.spaceBefore ?? {})
  const before = `(?<=[^${OPENERS}${puncts.map(esc).join('')}])`
  for (const punct of puncts) {
    const space = c.spaceBefore![punct]
    if (!isSet(space)) continue
    add(new RegExp(`${before}${S}*((?:${esc(punct)})+)${AFTER_PUNCT}`, 'gu'), (m) => space + m[1])
  }
  if (isSet(c.thousandsSeparator)) {
    add(new RegExp(`(?<=(?<![\\d.,])\\d{1,3}(?:${S}\\d{3})*)${S}(?=\\d{3}(?!\\d))`, 'gu'), c.thousandsSeparator)
  }
  if (isSet(c.ellipsis)) add(/(?<!\.)\.\.\.(?!\.)/g, c.ellipsis)
  if (isSet(c.unitSpace) && c.units?.length) {
    add(new RegExp(`(?<=\\d)${S}+(?=(?:${words(c.units)})(?![\\p{L}\\p{N}]))`, 'gu'), c.unitSpace)
  }
  if (isSet(c.abbreviationSpace) && c.abbreviations?.length) {
    const abbr = `(?<![\\p{L}\\p{N}])(?:${words(c.abbreviations)})`
    add(new RegExp(`(?<=${abbr})${S}+(?=[\\p{L}\\p{N}])`, 'gu'), c.abbreviationSpace)
  }
  if (isSet(c.dash)) add(new RegExp(`(?<=\\S${S})--?(?=${S}\\S)`, 'gu'), c.dash)
  // Last, so the final word carries its punctuation (`cri !`); only breakable spaces are glued.
  if (isSet(c.widowSpace)) {
    add(/(?<=\S)[ \t\u2000-\u2006\u2008-\u200A\u205F]+(?=\S+(?:[\u00A0\u2007\u202F]+[^\s\p{L}\p{N}]+)*\s*$)/gu, c.widowSpace)
  }
  return (run) => steps.forEach((step) => step(run))
}
