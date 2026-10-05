import { enter, INLINE, type FixParts, type Scope } from './scope.ts'

/** How to read one kind of tree. `tag` is undefined for nodes that are neither text nor element. */
interface Adapter<N> {
  text(node: N): string | undefined
  setText(node: N, text: string): void
  tag(node: N): string | undefined
  attr(node: N, name: string): string | null
  children(node: N): Iterable<N> | undefined
}

/** Fixes the text nodes of a tree in place, with the same scoping as the HTML parser. */
function fixTree<N>(a: Adapter<N>, fix: FixParts, root: N, scope: Scope): void {
  let run: N[] = []
  let runScope = scope

  const flush = () => {
    const fixed = run.length && !runScope.skip && runScope.locale ? fix(run.map((n) => a.text(n)!), runScope.locale) : undefined
    fixed?.forEach((text, i) => text !== a.text(run[i]!) && a.setText(run[i]!, text))
    run = []
  }
  const walk = (node: N, scope: Scope) => {
    for (const child of [...(a.children(node) ?? [])]) {
      if (a.text(child) !== undefined) {
        runScope = scope
        run.push(child)
        continue
      }
      const tag = a.tag(child)
      // Comments and other childless non-elements are transparent.
      if (tag === undefined && ![...(a.children(child) ?? [])].length) continue
      const inner = tag === undefined ? scope : (enter(tag, (name) => a.attr(child, name), scope) ?? scope)
      const boundary = inner !== scope || !INLINE.has(tag ?? '')
      if (boundary) flush()
      walk(child, inner)
      if (boundary) flush()
    }
  }
  walk(root, scope)
  flush()
}

const base = (locale: string | undefined): Scope => ({ name: '', depth: 0, skip: false, locale })

/** The subset of a DOM node this library reads, so it type-checks without the DOM lib. */
export interface DomNode {
  readonly nodeType: number
  nodeValue: string | null
  readonly childNodes: Iterable<DomNode>
  readonly parentElement: DomNode | null
  readonly localName?: string
  getAttribute?(name: string): string | null
}

const dom: Adapter<DomNode> = {
  text: (n) => (n.nodeType === 3 ? (n.nodeValue ?? '') : undefined),
  setText: (n, text) => void (n.nodeValue = text),
  tag: (n) => (n.nodeType === 1 ? n.localName : undefined),
  attr: (n, name) => n.getAttribute?.(name) ?? null,
  children: (n) => n.childNodes,
}

export function fixDomWith(fix: FixParts, root: DomNode, locale?: string): void {
  const chain: DomNode[] = []
  for (let n = root.parentElement; n; n = n.parentElement) chain.unshift(n)
  const scope = chain.reduce((s, el) => enter(el.localName!, (name) => dom.attr(el, name), s) ?? s, base(locale))
  if (root.nodeType === 3) {
    const fixed = !scope.skip && scope.locale ? fix([root.nodeValue ?? ''], scope.locale) : undefined
    if (fixed && fixed[0] !== root.nodeValue) root.nodeValue = fixed[0]!
  } else fixTree(dom, fix, { nodeType: 11, nodeValue: null, childNodes: [root], parentElement: null }, scope)
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
  text: (n) => (n.type === 'text' ? (n.value ?? '') : undefined),
  setText: (n, text) => void (n.value = text),
  tag: (n) => {
    if (n.type === 'element') return n.tagName
    if (n.type.startsWith('mdxJsx')) return n.name ?? 'fragment'
    return n.type === 'raw' ? 'raw' : undefined
  },
  attr: (n, name) => {
    if (n.properties) {
      const v = n.properties[camel(name)]
      return v === undefined || v === null || v === false ? null : v === true ? '' : [v].flat().join(' ')
    }
    const a = n.attributes?.find((a) => a.type === 'mdxJsxAttribute' && a.name === name)
    return a ? (typeof a.value === 'string' ? a.value : '') : null
  },
  children: (n) => n.children,
}

export const fixHastWith = (fix: FixParts, tree: HastNode, locale?: string): void =>
  fixTree(hast, fix, { type: 'root', children: [tree] }, base(locale))
