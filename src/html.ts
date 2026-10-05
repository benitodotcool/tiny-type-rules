const TOKEN =
  /<!--[\s\S]*?-->|<(script|style|textarea)\b[^>]*>[\s\S]*?<\/\1\s*>|<(\/?)([a-z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|<[!?][^>]*>|&(#\d+|#x[\da-f]+|[a-z][a-z\d]*);/gi

const INLINE = new Set(
  'a abbr b bdi bdo cite data del dfn em font i ins mark q s small span strong sub sup time u wbr'.split(' '),
)
const SKIP = new Set('code kbd math pre samp script style svg textarea var'.split(' '))
const VOID = new Set('area base br col embed hr img input link meta source track wbr'.split(' '))
const ENTITIES: Record<string, string> = {
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
  thinsp: ' ',
}

/** Decodes the entities rules care about, never one that would turn text into markup. */
function decode(entity: string): string | undefined {
  if (entity[0] !== '#') return Object.hasOwn(ENTITIES, entity) ? ENTITIES[entity] : undefined
  const code = /x/i.test(entity[1]!) ? parseInt(entity.slice(2), 16) : Number(entity.slice(1))
  if (!(code >= 0x20 && code <= 0x10ffff)) return undefined
  const char = String.fromCodePoint(code)
  return '<>&'.includes(char) ? undefined : char
}

const attribute = (name: string) => {
  const re = new RegExp(`\\s${name}(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+)))?(?=[\\s/>]|$)`, 'i')
  return (attrs: string) => {
    const m = re.exec(attrs)
    return m && (m[1] ?? m[2] ?? m[3] ?? '')
  }
}
const LANG = attribute('lang')
const TTR_LANG = attribute('data-ttr-lang')
const PREVENT = attribute('data-prevent-ttr')
const ENABLE = attribute('data-ttr')

type Scope = { name: string; depth: number; skip: boolean; locale: string | undefined }
type FixParts = (parts: readonly string[], locale: string) => string[] | undefined

/**
 * Walks HTML with a regex tokenizer: text between inline tags is fixed as one run,
 * any other tag ends the run. `fix` returns undefined for a locale it does not support.
 */
export function fixHtmlWith(fix: FixParts, html: string, locale?: string): string {
  const scopes: Scope[] = [{ name: '', depth: 0, skip: false, locale }]
  let out = ''
  let parts = ['']
  let glue: string[] = []
  let raw = ''

  const flush = () => {
    const { skip, locale } = scopes.at(-1)!
    const fixed = skip || !locale ? undefined : fix(parts, locale)
    if (fixed) out += fixed.reduce((acc, part, i) => acc + glue[i - 1] + part)
    else out += raw
    parts = ['']
    glue = []
    raw = ''
  }
  const text = (s: string, source = s) => {
    parts[parts.length - 1] += s
    raw += source
  }
  const inline = (token: string) => {
    glue.push(token)
    parts.push('')
    raw += token
  }
  const boundary = (token: string) => {
    flush()
    out += token
  }

  let last = 0
  for (const m of html.matchAll(TOKEN)) {
    text(html.slice(last, m.index))
    last = m.index + m[0].length
    const [token, rawText, closing, tagName, attrs = '', entity] = m
    const name = tagName?.toLowerCase() ?? ''
    const top = scopes.at(-1)!

    if (entity) {
      const char = decode(entity)
      if (char === undefined) inline(token)
      else text(char, token)
    } else if (token.startsWith('<!--')) inline(token)
    else if (!name || rawText) boundary(token)
    else if (closing && top.name === name && !top.depth) {
      flush()
      scopes.pop()
      out += token
    } else {
      const opens = !closing && !VOID.has(name) && !attrs.endsWith('/')
      const lang = opens ? (TTR_LANG(attrs) ?? LANG(attrs)) : null
      const prevent = opens && PREVENT(attrs) !== null
      const enable = opens && ENABLE(attrs) !== null
      if (opens && (lang !== null || prevent || enable || SKIP.has(name))) {
        flush()
        const skip = enable ? false : prevent || top.skip || SKIP.has(name)
        scopes.push({ name, depth: 0, skip, locale: lang ?? top.locale })
        out += token
        continue
      }
      if (top.name === name) top.depth += closing ? -1 : opens ? 1 : 0
      if (INLINE.has(name)) inline(token)
      else boundary(token)
    }
  }
  text(html.slice(last))
  flush()
  return out
}
