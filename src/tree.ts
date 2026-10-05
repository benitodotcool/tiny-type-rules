import { enter, INLINE, OPAQUE, SKIP, type FixParts, type Scope } from './scope.ts'

/**
 * How to read one kind of tree. `kind`: text, element, transparent (comments), opaque
 * (inline content to see as a word, such as an MDX expression), or block (anything else).
 */
interface Adapter<N> {
  kind(node: N): 'text' | 'element' | 'transparent' | 'opaque' | 'block'
  text(node: N): string
  setText(node: N, text: string): void
  tag(node: N): string
  attr(node: N, name: string): string | null
  children(node: N): ArrayLike<N> | undefined
}

/** Fixes the text nodes of a tree in place, with the same scoping as the HTML parser. */
function fixTree<N>(a: Adapter<N>, fix: FixParts, root: N, scope: Scope): void {
  let nodes: (N | undefined)[] = []
  let parts: string[] = []
  let runScope = scope
  let before = ''

  // Bounded, so many empty scopes in a row stay linear.
  const firstChar = (list: readonly N[], from = 0, budget = { n: 16 }): string => {
    for (let i = from; i < list.length && budget.n-- > 0; i++) {
      const node = list[i]!
      const kind = a.kind(node)
      if (kind === 'text' && a.text(node)) return a.text(node)[0]!
      if (kind === 'opaque') return OPAQUE
      if (kind === 'element') {
        const found = firstChar(Array.from(a.children(node) ?? []), 0, budget)
        if (found) return found
      }
    }
    return ''
  }
  const flush = (after = '') => {
    const fixed = parts.length && !runScope.skip && runScope.locale ? fix(parts, runScope.locale, before, after) : undefined
    fixed?.forEach((text, i) => nodes[i] && text !== parts[i] && a.setText(nodes[i]!, text))
    before = (fixed ?? parts).join('').slice(-1) || before
    nodes = []
    parts = []
  }
  const add = (node: N | undefined, text: string, scope: Scope) => {
    if (scope !== runScope) flush()
    runScope = scope
    nodes.push(node)
    parts.push(text)
  }

  const walk = (node: N, scope: Scope) => {
    const children = Array.from(a.children(node) ?? [])
    children.forEach((child, i) => {
      const kind = a.kind(child)
      if (kind === 'text') return add(child, a.text(child), scope)
      if (kind === 'opaque') return add(undefined, OPAQUE, scope)
      if (kind === 'transparent') return
      if (kind === 'block') {
        flush()
        before = ''
        return walk(child, scope)
      }
      const tag = a.tag(child)
      const inner = enter(tag, (name) => a.attr(child, name), scope) ?? scope
      if (inner.skip && SKIP.has(tag) && INLINE.has(tag)) return add(undefined, OPAQUE, scope)
      const inline = INLINE.has(tag)
      if (inner === scope && inline) return walk(child, scope)
      flush(inline ? firstChar([child]) : '')
      if (!inline) before = ''
      walk(child, inner)
      flush(inline ? firstChar(children, i + 1) : '')
      if (!inline) before = ''
    })
  }
  walk(root, scope)
  flush()
}

const base = (locale: string | undefined): Scope => ({ name: '', depth: 0, skip: false, locale })

/** The subset of a DOM node this library reads, so it type-checks without the DOM lib. */
export interface DomNode {
  readonly nodeType: number
  nodeValue: string | null
  readonly childNodes: ArrayLike<DomNode>
  readonly parentElement: DomNode | null
  readonly localName?: string
  getAttribute?(name: string): string | null
}

const dom: Adapter<DomNode> = {
  kind: (n) => (n.nodeType === 3 ? 'text' : n.nodeType === 1 ? 'element' : n.nodeType === 8 ? 'transparent' : 'block'),
  text: (n) => n.nodeValue ?? '',
  setText: (n, text) => void (n.nodeValue = text),
  tag: (n) => n.localName ?? '',
  attr: (n, name) => n.getAttribute?.(name) ?? null,
  children: (n) => n.childNodes,
}

export function fixDomWith(fix: FixParts, root: DomNode | null | undefined, locale?: string): void {
  if (!root) return
  const chain: DomNode[] = []
  for (let n = root.parentElement; n; n = n.parentElement) chain.unshift(n)
  const scope = chain.reduce((s, el) => enter(dom.tag(el), (name) => dom.attr(el, name), s) ?? s, base(locale))
  fixTree(dom, fix, { nodeType: 11, nodeValue: null, childNodes: [root], parentElement: null }, scope)
}

/** The subset of a hast (rehype) or MDX node this library reads. */
export interface HastNode {
  type: string
  value?: string
  tagName?: string
  name?: string | null
  properties?: Record<string, unknown>
  attributes?: readonly { type: string; name?: string; value?: unknown }[]
  children?: HastNode[]
}

const camel = (name: string) => name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

const hast: Adapter<HastNode> = {
  kind: (n) => {
    if (n.type === 'text') return 'text'
    if (n.type === 'element' || n.type === 'mdxJsxFlowElement' || n.type === 'mdxJsxTextElement') return 'element'
    if (n.type === 'comment') return 'transparent'
    return n.type === 'mdxTextExpression' ? 'opaque' : 'block'
  },
  text: (n) => n.value ?? '',
  setText: (n, text) => void (n.value = text),
  // An MDX element named like an HTML one (`<pre>`) is that element; a component is a span or a div.
  tag: (n) =>
    n.type === 'element'
      ? n.tagName!
      : n.name && /^[a-z]/.test(n.name)
        ? n.name
        : n.type === 'mdxJsxTextElement'
          ? 'span'
          : 'div',
  attr: (n, name) => {
    if (n.properties) {
      const v = n.properties[camel(name)]
      return v === undefined || v === null || v === false ? null : v === true ? '' : [v].flat().join(' ')
    }
    const a = n.attributes?.find((a) => a.type === 'mdxJsxAttribute' && a.name === name)
    if (!a) return null
    if (typeof a.value === 'string') return a.value
    // An expression value is unknown here: no language, and `{false}` turns a flag off.
    if (name.endsWith('lang') && a.value) return null
    return (a.value as { value?: unknown } | null)?.value === 'false' ? null : ''
  },
  children: (n) => n.children,
}

export const fixHastWith = (fix: FixParts, tree: HastNode, locale?: string): void =>
  fixTree(hast, fix, { type: 'root', children: [tree] }, base(locale))
