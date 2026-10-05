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

  /** Replaces every match of a global regex, starting at `from`. */
  replace(re: RegExp, rep: Replacer, from = 0): void {
    const { text, marks } = this
    re.lastIndex = from
    let out = ''
    let last = 0
    let i = 0
    for (const m of text.matchAll(re)) {
      const start = m.index
      const end = start + m[0].length
      const r = typeof rep === 'string' ? rep : rep(m)
      out += text.slice(last, start)
      const at = out.length
      // A mark inside the match follows the text the replacement keeps at its end (` ?` to `?`).
      let kept = 0
      while (kept < m[0].length && kept < r.length && m[0].at(-1 - kept) === r.at(-1 - kept)) kept++
      while (i < marks.length && marks[i]! <= start) marks[i]! += at - start, i++
      while (i < marks.length && marks[i]! < end) {
        const mark = marks[i]!
        marks[i++] = end - mark <= kept ? at + r.length - (end - mark) : at + Math.min(mark - start, r.length - kept)
      }
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
// What may sit right before an opening quote, and right after a closing one.
const QUOTE_BEFORE = new RegExp(`[${OPENERS}:;,]`, 'u')
const QUOTE_AFTER = /[\s\p{Pe}\p{Pf}.,…;:!?]/u
// Breakable spaces, the only ones widows glue.
const BREAKABLE = '[ \\t\\u2000-\\u2006\\u2008-\\u200A\\u205F]'
const EMOTICON = '(?!-?[()DPp](?![\\p{L}\\p{N}]))'

// Config strings enter regexes as code points, safe both inside and outside a class.
const esc = (s: string) => [...s].map((ch) => `\\u{${ch.codePointAt(0)!.toString(16)}}`).join('')
const isSet = (v: false | string | undefined): v is string => typeof v === 'string'

/** Whether a straight quote opens: from its neighbours, and from the nesting when they are ambiguous. */
function opens(m: RegExpMatchArray, depth: number): boolean {
  const s = m.input!
  const i = m.index!
  const before = i === 0 || QUOTE_BEFORE.test(s[i - 1]!)
  const after = i + 1 >= s.length || QUOTE_AFTER.test(s[i + 1]!)
  return before === after ? depth === 0 : before
}

/**
 * Start of the spaces before the last word that has a letter or a digit, the words made of
 * punctuation after it included (`fin …`). 0 when there is nothing to glue. Linear.
 */
function lastWord(text: string): number {
  const space = /\s/
  let i = text.length
  while (i && space.test(text[i - 1]!)) i--
  for (;;) {
    let start = i
    while (start && !space.test(text[start - 1]!)) start--
    if (start === i) return 0
    const word = /[\p{L}\p{N}]/u.test(text.slice(start, i))
    i = start
    while (i && space.test(text[i - 1]!)) i--
    if (!i) return 0
    if (word) return i
  }
}

/** Turns a locale config into the function that applies it. */
export function compile(c: LocaleConfig): (run: Run) => void {
  const steps: ((run: Run) => void)[] = []
  // `need`: a string the text must contain for the rule to run at all.
  const add = (re: RegExp, rep: Replacer, need = '') =>
    steps.push((run) => run.text.includes(need) && run.replace(re, rep))
  const q = c.quotes || undefined
  const words = (list: readonly string[]) => [...list].sort((a, b) => b.length - a.length).map(esc).join('|')

  for (const [from, to] of Object.entries(c.replacements ?? {})) if (from) add(new RegExp(esc(from), 'gu'), to)
  if (isSet(c.ellipsis)) add(/(?<!\.)\.\.\.(?!\.)/g, c.ellipsis)

  if (isSet(c.apostrophe)) {
    add(/(?<=[\p{L}\p{N}])'(?=[\p{L}\p{N}])/gu, c.apostrophe, "'")
    add(/(?<=^|[\s(])'(?=\d\ds?\b)/g, c.apostrophe)
  }
  if (q || c.singleQuotes || isSet(c.apostrophe)) {
    const re = new RegExp(['"', "'", ...(q ? [q[0], q[1]] : [])].map(esc).join('|'), 'gu')
    steps.push((run) => {
      let depth = 0
      let single = 0
      run.replace(re, (m) => {
        const ch = m[0]
        if (ch === "'") {
          if (!c.singleQuotes) return isSet(c.apostrophe) ? c.apostrophe : ch
          if (opens(m, single)) return single++, c.singleQuotes[0]
          single = Math.max(0, single - 1)
          return c.singleQuotes[1]
        }
        if (ch !== '"') return (depth = ch === q![0] ? depth + 1 : Math.max(0, depth - 1)), ch
        if (!q) return ch
        if (opens(m, depth)) return q[depth++ ? 2 : 0]
        // An unmatched closing quote right after a digit is an inch mark: `27"`.
        if (!depth && /\d/.test(m.input![m.index! - 1] ?? '')) return ch
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
    const guard = ':;'.includes(punct) ? EMOTICON : ''
    const re = new RegExp(`${before}${S}*((?:${esc(punct)})+)${guard}${AFTER_PUNCT}`, 'gu')
    add(re, (m) => space + m[1], punct)
  }
  if (isSet(c.thousandsSeparator)) {
    add(new RegExp(`(?<=(?<![\\d.,])\\d{1,3}(?:${S}\\d{3})*)${S}(?=\\d{3}(?!\\d))`, 'gu'), c.thousandsSeparator)
  }
  if (isSet(c.unitSpace) && c.units?.length) {
    add(new RegExp(`(?<=\\d)${S}+(?=(?:${words(c.units)})(?![\\p{L}\\p{N}'’]))`, 'gu'), c.unitSpace)
  }
  if (isSet(c.abbreviationSpace) && c.abbreviations?.length) {
    const abbr = `(?<![\\p{L}\\p{N}])(?:${words(c.abbreviations)})`
    add(new RegExp(`(?<=${abbr})${S}+(?=[\\p{L}\\p{N}])`, 'gu'), c.abbreviationSpace)
  }
  if (isSet(c.dash)) add(new RegExp(`(?<=\\S${S})--?(?=${S}\\S)`, 'gu'), c.dash)
  // Last, so the final word carries the punctuation after it (`cri !`, `fin …`).
  if (isSet(c.widowSpace)) {
    const space = c.widowSpace
    const re = new RegExp(`${BREAKABLE}+`, 'gu')
    steps.push((run) => {
      const from = lastWord(run.text)
      const end = run.text.trimEnd().length
      if (from > 0) run.replace(re, (m) => (m.index! < end ? space : m[0]), from)
    })
  }
  return (run) => steps.forEach((step) => step(run))
}
