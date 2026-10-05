import { cachedParts, cachedValue } from '../cache.ts'
import { createTypo, type Typo, type TypoOptions } from '../index.ts'
import { enter, OPAQUE, type Scope } from '../scope.ts'

/** What `TTRProvider` takes: the default language and per-language settings. */
export type Settings = Pick<TypoOptions, 'locale' | 'locales'>

type Props = Record<string, unknown>
type Jsx = (type: unknown, props: Props, key?: unknown, ...rest: unknown[]) => unknown

const fixers = new Map<string, Typo>()

/** A fixer with these settings, memoized, bound to their default language. */
export function fixerFor(settings: Settings | undefined): Typo {
  const key = JSON.stringify(settings ?? null)
  let typo = fixers.get(key)
  if (!typo) fixers.set(key, (typo = createTypo({ locale: settings?.locale, locales: settings?.locales })))
  return typo
}

const isElement = (node: unknown): node is object => typeof node === 'object' && node !== null && '$$typeof' in node

function fixChildren(typo: Typo, children: unknown, locale: string): unknown {
  const parts: string[] = []
  const collect = (node: unknown): void => {
    if (typeof node === 'string' || typeof node === 'number') parts.push(String(node))
    else if (Array.isArray(node)) node.forEach(collect)
    else if (node != null && typeof node !== 'boolean') parts.push(OPAQUE)
  }
  collect(children)
  if (parts.every((part) => part === OPAQUE)) return children
  const fixed = cachedParts(typo, parts, locale)
  let i = 0
  let changed = false
  const rebuild = (node: unknown): unknown => {
    if (typeof node === 'string' || typeof node === 'number') {
      const text = fixed[i++]!
      if (text === String(node)) return node
      changed = true
      return text
    }
    if (Array.isArray(node)) return node.map(rebuild)
    if (node != null && typeof node !== 'boolean') i++
    return node
  }
  const out = rebuild(children)
  return changed ? out : children
}

function fixProps(settings: Settings | undefined, type: unknown, props: Props, scope: Scope): Props {
  const locale = scope.locale
  if (scope.skip || !locale) return props
  const typo = fixerFor(settings)
  let out = props
  const html = props.dangerouslySetInnerHTML as { __html?: unknown } | undefined
  if (typeof type === 'string' && typeof html?.__html === 'string') {
    out = { ...out, dangerouslySetInnerHTML: { __html: typo.html(html.__html, locale) } }
  }
  const value = cachedValue(typo, props.value, locale)
  if (value !== props.value) out = { ...out, value }
  const children = props.children
  if (children != null && typeof children !== 'function') {
    const fixed = fixChildren(typo, children, locale)
    if (fixed !== children) out = { ...out, children: fixed }
  }
  return out
}

// Elements this runtime made, with their props as written, so a scope set by an
// ancestor (`lang`, `data-ttr-prevent`) can fix them again: JSX builds children first.
const written = new WeakMap<object, [unknown, Props, unknown, unknown[]]>()

function restore(jsx: Jsx, settings: Settings | undefined, node: unknown, scope: Scope): unknown {
  if (Array.isArray(node)) return node.map((child) => restore(jsx, settings, child, scope))
  const original = isElement(node) ? written.get(node) : undefined
  return original ? build(jsx, settings, original[0], original[1], original[2], original[3], scope) : node
}

/** Creates an element with its text fixed, the way React's own `jsx` would create it. */
export function build(
  jsx: Jsx,
  settings: Settings | undefined,
  type: unknown,
  props: Props,
  key: unknown,
  rest: unknown[],
  inherited?: Scope,
): unknown {
  const base = inherited ?? { name: '', depth: 0, skip: false, locale: settings?.locale }
  const attr = (name: string) => {
    const value = props?.[name]
    return value == null || value === false ? null : String(value)
  }
  const scope = (props && enter(typeof type === 'string' ? type : '', attr, base)) ?? base
  let next = props
  if (props && 'children' in props && (inherited || scope !== base)) {
    next = { ...props, children: restore(jsx, settings, props.children, scope) }
  }
  if (next) next = fixProps(settings, type, next, scope)
  const element = jsx(type, next, key, ...rest)
  if (props && isElement(element)) written.set(element, [type, props, key, rest])
  return element
}
