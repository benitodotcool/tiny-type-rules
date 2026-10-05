import { getCurrentInstance, hasInjectionContext, inject, toDisplayString, type App, type InjectionKey } from 'vue'

import { createTypo, type Typo, type TypoOptions } from '../index.ts'
import { OPAQUE, SKIP } from '../scope.ts'
import type { DomNode } from '../tree.ts'

export type TTRPluginOptions = TypoOptions & {
  /** Also fixes the whole page in the browser once the app is mounted, and keeps it fixed. */
  auto?: boolean
  /** Current language, read on every render: a reactive source (i18n) switches the rules live. */
  getLocale?: () => string | undefined
}

const TTR_KEY: InjectionKey<Typo> = Symbol('tiny-type-rules')
const builtIn = createTypo()

/** The fixer of `TTRPlugin`, bound to the current language, for text the templates do not show. */
export const useTTR = (): Typo => (hasInjectionContext() ? inject(TTR_KEY, builtIn) : builtIn)

type Scope = { skip: boolean; locale?: string }
type Props = Record<string, unknown> | null | undefined

const has = (props: Props, name: string) => props != null && name in props && props[name] !== false
const portableTexts = new WeakMap<object, Map<string, unknown>>()
const isPortableText = (value: unknown): value is unknown[] =>
  Array.isArray(value) &&
  value.some(
    (block) => (block as { _type?: unknown } | null)?._type === 'block' && Array.isArray((block as { children?: unknown }).children),
  )

/** Scope set on the components around the current render (`<Card lang="en">`), innermost first. */
function runtimeScope(fallback: string | undefined): Scope {
  for (let instance = getCurrentInstance(); instance; instance = instance.parent) {
    const props = instance.vnode.props
    if (has(props, 'data-ttr')) return { skip: false, locale: fallback }
    if (has(props, 'data-ttr-prevent')) return { skip: true }
    const lang = props?.['data-ttr-lang'] ?? props?.lang
    if (typeof lang === 'string') return { skip: false, locale: lang }
  }
  return { skip: false, locale: fallback }
}

/** `app.use(TTRPlugin, { locale: 'fr' })`: lets the `ttrTransform` templates fix their text. */
export const TTRPlugin = {
  install(app: App, options: TTRPluginOptions = {}) {
    const fixer = createTypo({ locales: options.locales })
    const current = () => options.getLocale?.() ?? options.locale
    // `local`: a language set in the template, `'+'` for `data-ttr`, undefined to inherit.
    const scope = (local?: string): Scope =>
      local === '+' ? { skip: false, locale: current() } : local ? { skip: false, locale: local } : runtimeScope(current())

    const results = new Map<string, string[]>()
    // Interpolated objects and arrays render as JSON: a word to the rules, left as is.
    const isText = (piece: unknown) => typeof piece === 'string' || typeof piece === 'number'
    app.config.globalProperties.$ttr = (pieces: unknown[], index: number, local?: string) => {
      const piece = pieces[index]
      const { skip, locale } = scope(local)
      if (skip || !locale || !isText(piece)) return toDisplayString(piece)
      const texts = pieces.map((p) => (p == null ? '' : isText(p) ? String(p) : OPAQUE))
      const key = `${locale}\u0000${texts.join('\u0001')}`
      let fixed = results.get(key)
      if (!fixed) {
        if (results.size > 2000) results.clear()
        results.set(key, (fixed = fixer.parts(texts, locale)))
      }
      return fixed[index]
    }
    app.config.globalProperties.$ttrHtml = (html: unknown, local?: string) => {
      const { skip, locale } = scope(local)
      return skip || !locale || typeof html !== 'string' ? html : fixer.html(html, locale)
    }
    app.config.globalProperties.$ttrValue = (value: unknown, local?: string) => {
      if (!isPortableText(value)) return value
      const { skip, locale } = scope(local)
      if (skip || !locale) return value
      let cache = portableTexts.get(value)
      if (!cache) portableTexts.set(value, (cache = new Map()))
      if (!cache.has(locale)) cache.set(locale, fixer.portableText(value, locale))
      return cache.get(locale)
    }

    const bound = Object.fromEntries(
      Object.entries(fixer).map(([name, method]) => [
        name,
        (input: unknown, locale?: string) => (method as (a: unknown, b?: string) => unknown)(input, locale ?? current()),
      ]),
    ) as unknown as Typo
    app.provide(TTR_KEY, bound)

    const body = (globalThis as { document?: { body: DomNode } }).document?.body
    if (!options.auto || !body) return
    const mount = app.mount
    app.mount = (...args: Parameters<typeof mount>) => {
      const vm = mount(...args)
      fixer.watch(body, current())
      return vm
    }
  },
}

// Template AST node types and element kinds, from @vue/compiler-core.
const ELEMENT = 1
const TEXT = 2
const COMMENT = 3
const SIMPLE_EXPRESSION = 4
const INTERPOLATION = 5
const ATTRIBUTE = 6
const DIRECTIVE = 7
const COMPONENT = 1

type Node = {
  type: number
  tag?: string
  tagType?: number
  content?: unknown
  loc: unknown
  props?: Prop[]
  children?: Node[]
}
type Prop = { type: number; name: string; value?: { content: string }; arg?: { content?: string }; exp?: { content: string; ast?: unknown } }
type Compiled = { skip: boolean; locale?: string; explicit: boolean }

function compiledScope(node: Node, parent: Compiled): Compiled {
  const attr = (name: string) => node.props?.find((p) => p.type === ATTRIBUTE && p.name === name)
  if (attr('data-ttr')) return { skip: false, locale: attr('lang')?.value?.content ?? parent.locale, explicit: true }
  const lang = (attr('data-ttr-lang') ?? attr('lang'))?.value?.content
  const skip = parent.skip || !!attr('data-ttr-prevent') || (node.tagType !== COMPONENT && SKIP.has(node.tag ?? ''))
  return lang ? { skip, locale: lang, explicit: true } : { ...parent, skip }
}

const expression = (content: string, loc: unknown) => ({ type: SIMPLE_EXPRESSION, content, isStatic: false, constType: 0, loc })
const localOf = (scope: Compiled) => (scope.explicit ? JSON.stringify(scope.locale ?? '+') : 'undefined')

function visit(node: Node, scope: Compiled): void {
  const local = localOf(scope)
  if (node.type === ELEMENT && node.tagType === COMPONENT) {
    // Hand the template's scope to the component, whose own text is fixed in its own template.
    const names = new Set(node.props?.map((p) => p.name))
    const add = (name: string, value?: string) =>
      node.props!.push({ type: ATTRIBUTE, name, value: value === undefined ? undefined : { content: value }, loc: node.loc } as Prop)
    if (scope.skip && !names.has('data-ttr-prevent') && !names.has('data-ttr')) add('data-ttr-prevent')
    else if (scope.explicit && scope.locale && !names.has('lang') && !names.has('data-ttr-lang')) add('data-ttr-lang', scope.locale)
  }
  const children = node.children ?? []
  for (const child of children) if (child.type === ELEMENT) visit(child, compiledScope(child, scope))
  if (scope.skip) return

  for (const prop of node.props ?? []) {
    if (prop.type !== DIRECTIVE || !prop.exp) continue
    const wrap =
      prop.name === 'html' ? '$ttrHtml' : prop.name === 'bind' && prop.arg?.content === 'value' && node.tagType === COMPONENT ? '$ttrValue' : ''
    if (!wrap) continue
    prop.exp.content = `${wrap}((${prop.exp.content}), ${local})`
    // Vue parsed the expression already: drop that tree so the new text is parsed again.
    prop.exp.ast = undefined
  }

  const pieces: string[] = []
  const at = new Map<number, number>()
  children.forEach((child, i) => {
    if (child.type === TEXT) at.set(i, pieces.push(JSON.stringify(child.content)) - 1)
    else if (child.type === INTERPOLATION) at.set(i, pieces.push(`(${(child.content as { content: string }).content})`) - 1)
    else if (child.type !== COMMENT) pieces.push(JSON.stringify(OPAQUE))
  })
  const hasText = [...at.keys()].some((i) => children[i]!.type === INTERPOLATION || /\S/.test(String(children[i]!.content)))
  if (!hasText) return
  const list = `[${pieces.join(', ')}]`
  for (const [i, piece] of at) {
    const child = children[i]!
    children[i] = { type: INTERPOLATION, loc: child.loc, content: expression(`$ttr(${list}, ${piece}, ${local})`, child.loc) }
  }
}

/**
 * Vue compiler transform: every text of a template, `v-html` and Portable Text passed as
 * `:value` go through the fixer at render time, on the server and in the browser alike.
 */
export function ttrTransform(node: Node): void {
  // The whole template at once, before Vue's own transforms copy any part of it (SSR slots).
  if (node.type === 0) visit(node, { skip: false, explicit: false })
}
