import { enter, INLINE, OPAQUE, SKIP, type FixParts, type Scope } from './scope.ts'

const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '))
// Raw text elements: their content is never parsed nor fixed.
const RAW = new Set('iframe noembed noframes plaintext script style textarea xmp'.split(' '))
// A start tag of one of these closes an open `p`.
const CLOSES_P = new Set(
  'address article aside blockquote details dialog div dl fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr main menu nav ol p pre section table ul'.split(
    ' ',
  ),
)
// Names are case-sensitive; a few legacy ones also work without their semicolon.
const ENTITY = /&(?:#(\d+);?|#[xX]([\da-fA-F]+);?|(nbsp|quot|laquo|raquo)(?![a-zA-Z\d]*;)|([a-zA-Z][a-zA-Z\d]*);)/y
const NAMED: Record<string, string> = {
  nbsp: ' ',
  quot: '"',
  apos: "'",
  hellip: '…',
  laquo: '«',
  raquo: '»',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  ndash: '–',
  mdash: '—',
  thinsp: ' ',
}
// A decoded character must not be able to rebuild a tag or an entity with its neighbours.
const SAFE = /^[^\p{L}\p{N}\p{Cc}\p{Cs}<>&;#=]$/u

function decode(m: RegExpExecArray): string | undefined {
  const [, dec, hex, legacy, name] = m
  const named = legacy ?? name
  if (named) return Object.hasOwn(NAMED, named) ? NAMED[named] : undefined
  const code = dec ? Number(dec) : parseInt(hex!, 16)
  if (!(code <= 0x10ffff)) return undefined
  const char = String.fromCodePoint(code)
  return SAFE.test(char) ? char : undefined
}

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
  while (html[i] === '<' && /[a-zA-Z/!?]/.test(html[i + 1] ?? '')) {
    const end = html.indexOf('>', i)
    if (end < 0) return ''
    i = end + 1
  }
  return html[i] ?? ''
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
      out += text === part ? raws[i] : opaque[i] ? text.replaceAll(OPAQUE, raws[i]!) : text
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
        text('&')
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
      while (top.name !== name && (top.name === 'p' || top.name === 'li') && !top.depth) {
        pop()
        top = scopes.at(-1)!
      }
      if (top.name === name && !top.depth) {
        pop(INLINE.has(name) ? peek(html, i) : '')
        out += token
      } else {
        if (top.name === name) top.depth--
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
      if (((CLOSES_P.has(tag.name) && top.name === 'p') || (tag.name === 'li' && top.name === 'li')) && !top.depth) {
        pop()
        top = scopes.at(-1)!
      }
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
        if (opens && top.name === tag.name) top.depth++
        if (INLINE.has(tag.name)) split(token)
        else block(token)
      }
    } else {
      text('<')
      i++
    }
  }
  flush()
  return out
}
