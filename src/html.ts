import { enter, INLINE, OPAQUE, SKIP, type FixParts, type Scope } from './scope.ts'

const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '))
// Raw text elements: their content is never parsed nor fixed.
const RAW = new Set('iframe noembed noframes plaintext script style textarea xmp'.split(' '))
// Elements whose end tag is optional: the start tags and end tags that close them implicitly,
// and the containers that shield them from both (a list nested in an `li`).
const BLOCKS =
  'address article aside blockquote details dialog div dl fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr main menu nav ol p pre section table ul'
const AUTO: Record<string, { starts: Set<string>; ends: Set<string>; shields: Set<string> }> = {}
for (const [names, starts, ends, shields] of [
  ['p', BLOCKS, BLOCKS.replace(/\bp\b/, '') + ' body li dd dt td th', ''],
  ['li', 'li', 'ul ol menu body', 'ul ol menu'],
  ['dt dd', 'dt dd', 'dl body', 'dl'],
  ['td th', 'td th tr tbody thead tfoot', 'tr tbody thead tfoot table body', 'table'],
  ['tr', 'tr tbody thead tfoot', 'tbody thead tfoot table body', 'table'],
  ['option', 'option optgroup', 'select datalist optgroup body', ''],
] as const) {
  const set = (list: string) => new Set(list.split(' ').filter(Boolean))
  for (const name of names.split(' ')) AUTO[name] = { starts: set(starts), ends: set(ends), shields: set(shields) }
}

// Names are case-sensitive; a few legacy ones also work without their semicolon.
const ENTITY = /&(?:#(\d+);?|#[xX]([\da-fA-F]+);?|(nbsp|quot|laquo|raquo|copy|reg|deg|amp|lt|gt)(?![a-zA-Z\d]*;)|([a-zA-Z][a-zA-Z\d]*);)/y
// Latin-1 (U+00A0 to U+00FF) in code point order, then the typographic entities.
const LATIN1 =
  'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml'
const NAMED = new Map<string, string>([
  ...LATIN1.split(' ').map((name, i) => [name, String.fromCharCode(0xa0 + i)] as const),
  ...Object.entries({
    gt: '>', quot: '"', apos: "'",
    OElig: 'Œ', oelig: 'œ', Scaron: 'Š', scaron: 'š', Yuml: 'Ÿ', euro: '€', trade: '™',
    ensp: '\u2002', emsp: '\u2003', thinsp: '\u2009', hairsp: '\u200A', ndash: '–', mdash: '—', minus: '−',
    lsquo: '‘', rsquo: '’', sbquo: '‚', ldquo: '“', rdquo: '”', bdquo: '„', lsaquo: '‹', rsaquo: '›',
    hellip: '…', bull: '•', prime: '′', Prime: '″', permil: '‰', larr: '←', rarr: '→',
  }),
])

/** Decodes a character reference; undefined for `<`, `&`, an unknown name or a control character. */
function decode(m: RegExpExecArray): string | undefined {
  const [, dec, hex, legacy, name] = m
  const named = legacy ?? name
  if (named) return NAMED.get(named)
  const code = dec ? Number(dec) : parseInt(hex!, 16)
  if (!(code <= 0x10ffff)) return undefined
  const char = String.fromCodePoint(code)
  return /^[^\p{Cc}\p{Cs}<&]$/u.test(char) ? char : undefined
}

// `<` and `&` typed as text are opaque, and escaped when their run changes, so decoded
// characters next to them can never form a tag or an entity.
const SAFE: Record<string, string> = { '<': '&lt;', '&': '&amp;' }

const TAG_NAME = /[a-zA-Z][^\s/>]*/y
const ATTRIBUTE = /[\s/]+|([^\s/>][^\s/>=]*)(?:\s*=\s*(?:"([^"]*)"?|'([^']*)'?|([^\s>]*)))?/y

/** Reads a start tag at `i` the way a browser does. Undefined when the tag never ends. */
function readTag(html: string, i: number) {
  TAG_NAME.lastIndex = i + 1
  const name = TAG_NAME.exec(html)![0].toLowerCase()
  const attrs = new Map<string, string>()
  let j = TAG_NAME.lastIndex
  while (j < html.length && html[j] !== '>') {
    ATTRIBUTE.lastIndex = j
    const m = ATTRIBUTE.exec(html)!
    const key = m[1]?.toLowerCase()
    if (key && !attrs.has(key)) attrs.set(key, m[2] ?? m[3] ?? m[4] ?? '')
    j = ATTRIBUTE.lastIndex
  }
  if (j >= html.length) return undefined
  return { name, attrs, end: j + 1, selfClosing: html[j - 1] === '/' }
}

/** Index right after the end tag of `name` found from `i`, or the end of the HTML. */
function endOf(html: string, name: string, i: number): number {
  const close = new RegExp(`</${name}(?=[\\s/>])`, 'ig')
  close.lastIndex = i
  const m = close.exec(html)
  return m ? html.indexOf('>', m.index) + 1 || html.length : html.length
}

/** First text character from `i` on, skipping tags. */
function peek(html: string, i: number): string {
  // Bounded, so a long series of empty scopes stays linear.
  for (let n = 0; n < 8 && html[i] === '<' && /[a-zA-Z/!?]/.test(html[i + 1] ?? ''); n++) {
    const end = html.indexOf('>', i)
    if (end < 0) return ''
    i = end + 1
  }
  return html[i] === '<' ? '' : (html[i] ?? '')
}

/**
 * Fixes the text of an HTML string. Text between inline tags is fixed as one run, any other
 * tag ends it. Text a rule did not change is written back from the source, entities included.
 */
export function fixHtmlWith(fix: FixParts, html: string, locale?: string): string {
  const scopes: Scope[] = [{ name: '', depth: 0, skip: false, locale }]
  let out = ''
  let parts = ['']
  let raws = ['']
  let opaque = [false]
  let glue: string[] = []
  let before = ''

  const flush = (after = '') => {
    const { skip, locale } = scopes.at(-1)!
    const fixed = skip || !locale ? undefined : fix(parts, locale, before, after)
    parts.forEach((part, i) => {
      if (i) out += glue[i - 1]
      const text = fixed?.[i] ?? part
      out += text === part ? raws[i] : opaque[i] ? text.replaceAll(OPAQUE, SAFE[raws[i]!] ?? raws[i]!) : text
    })
    before = (fixed ?? parts).join('').slice(-1) || before
    parts = ['']
    raws = ['']
    opaque = [false]
    glue = []
  }
  const text = (s: string, source = s) => {
    parts[parts.length - 1] += s
    raws[raws.length - 1] += source
  }
  const split = (token: string, part = '', source = '', isOpaque = false) => {
    glue.push(token)
    parts.push(part)
    raws.push(source)
    opaque.push(isOpaque)
  }
  // An opaque piece is fixed as one unknown character, then written back as is.
  const opaquePiece = (source: string) => {
    split('', OPAQUE, source, true)
    split('')
  }
  const block = (token: string) => {
    flush()
    before = ''
    out += token
  }
  const pop = (after = '') => {
    flush(after)
    const { name } = scopes.pop()!
    if (!INLINE.has(name)) before = ''
  }

  let i = 0
  while (i < html.length) {
    const lt = html.indexOf('<', i)
    const amp = html.indexOf('&', i)
    const next = Math.min(lt < 0 ? html.length : lt, amp < 0 ? html.length : amp)
    text(html.slice(i, next))
    i = next
    if (i >= html.length) break

    if (html[i] === '&') {
      ENTITY.lastIndex = i
      const m = ENTITY.exec(html)
      if (!m) {
        opaquePiece('&')
        i++
        continue
      }
      const char = decode(m)
      if (char === undefined) opaquePiece(m[0])
      else text(char, m[0])
      i = ENTITY.lastIndex
      continue
    }

    const c = html[i + 1] ?? ''
    if (html.startsWith('<!--', i)) {
      const stop = html.startsWith('<!-->', i)
        ? i + 5
        : html.startsWith('<!--->', i)
          ? i + 6
          : (html.indexOf('-->', i + 4) + 1 || html.length - 2) + 2
      split(html.slice(i, stop))
      i = stop
    } else if (c === '!' || c === '?') {
      const stop = html.indexOf('>', i) + 1 || html.length
      block(html.slice(i, stop))
      i = stop
    } else if (c === '/' && /[a-zA-Z]/.test(html[i + 2] ?? '')) {
      const stop = html.indexOf('>', i) + 1 || html.length
      const token = html.slice(i, stop)
      const name = /^<\/([^\s/>]+)/.exec(token)![1]!.toLowerCase()
      i = stop
      let top = scopes.at(-1)!
      while (AUTO[top.name]?.ends.has(name) && !top.depth) {
        pop()
        top = scopes.at(-1)!
      }
      if (AUTO[top.name]?.shields.has(name) && top.depth) {
        top.depth--
        block(token)
      } else if (top.name === name && !top.depth) {
        pop(INLINE.has(name) ? peek(html, i) : '')
        out += token
      } else {
        if (top.name === name && !AUTO[name]) top.depth--
        if (INLINE.has(name)) split(token)
        else block(token)
      }
    } else if (/[a-zA-Z]/.test(c)) {
      const tag = readTag(html, i)
      if (!tag) {
        block(html.slice(i))
        break
      }
      const token = html.slice(i, tag.end)
      i = tag.end
      let top = scopes.at(-1)!
      while (AUTO[top.name]?.starts.has(tag.name) && !top.depth) {
        pop()
        top = scopes.at(-1)!
      }
      // In an element with an optional end tag, `depth` counts the shielding containers instead.
      if (AUTO[top.name]?.shields.has(tag.name)) top.depth++
      if (RAW.has(tag.name)) {
        const stop = tag.name === 'plaintext' ? html.length : endOf(html, tag.name, i)
        block(token + html.slice(i, stop))
        i = stop
        continue
      }
      const foreign = top.name === 'svg' || top.name === 'math'
      const opens = !VOID.has(tag.name) && !(foreign && tag.selfClosing)
      const scope = opens ? enter(tag.name, (name) => tag.attrs.get(name) ?? null, top) : undefined
      if (scope?.skip && SKIP.has(tag.name) && INLINE.has(tag.name)) {
        // Inline code is one opaque word: rules see around it, never into it.
        const stop = endOf(html, tag.name, i)
        opaquePiece(token + html.slice(i, stop))
        i = stop
      } else if (scope) {
        const inline = INLINE.has(tag.name)
        flush(inline ? peek(html, i) : '')
        if (!inline) before = ''
        scopes.push(scope)
        out += token
      } else {
        if (opens && top.name === tag.name && !AUTO[tag.name]) top.depth++
        if (INLINE.has(tag.name)) split(token)
        else block(token)
      }
    } else {
      opaquePiece('<')
      i++
    }
  }
  flush()
  return out
}
