import {
  Comment,
  defineComponent,
  Fragment,
  h,
  hasInjectionContext,
  inject,
  isVNode,
  Static,
  Text,
  type App,
  type Component,
  type InjectionKey,
  type PropType,
  type VNode,
  type VNodeArrayChildren,
} from 'vue'

import { createTypo, type Typo as Fixer, type TypoOptions } from '../index.ts'
import { OPAQUE, SKIP } from '../scope.ts'
import type { DomNode } from '../tree.ts'

const builtIn = createTypo()

/** Where `TypoPlugin` provides the fixer. */
export const TYPO_KEY: InjectionKey<Fixer> = Symbol('tiny-type-rules')

/** The fixer provided by `TypoPlugin`, else the built-in one. */
export const useTypo = (): Fixer => (hasInjectionContext() ? inject(TYPO_KEY, builtIn) : builtIn)

export type TypoPluginOptions = TypoOptions & {
  /** Also fixes the whole page in the browser once the app is mounted, and keeps it fixed. */
  auto?: boolean
}

/** `app.use(TypoPlugin, { locale: 'fr' })`: shares your settings with every `Typo` and `useTypo`. */
export const TypoPlugin = {
  install(app: App, options: TypoPluginOptions = {}) {
    const typo = createTypo(options)
    app.provide(TYPO_KEY, typo)
    const body = (globalThis as { document?: { body: DomNode } }).document?.body
    if (!options.auto || !body) return
    const mount = app.mount
    app.mount = (...args: Parameters<typeof mount>) => {
      const vm = mount(...args)
      typo.watch(body)
      return vm
    }
  },
}

type Target = { text: string; set(text: string): void }
type Props = Record<string, unknown> | null

const noop = () => {}
// Code, another language or an opted-out element: the rules see a word there, never inside.
const opaque = (type: string, props: Props) =>
  SKIP.has(type) || props?.['data-ttr-prevent'] != null || props?.lang != null || props?.['data-ttr-lang'] != null

function collect(nodes: VNodeArrayChildren, out: Target[], fix: (nodes: VNode[]) => void): void {
  nodes.forEach((node, i) => {
    if (typeof node === 'string' || typeof node === 'number') {
      out.push({ text: String(node), set: (text) => (nodes[i] = text) })
    } else if (Array.isArray(node)) collect(node, out, fix)
    else if (isVNode(node)) visit(node, out, fix)
  })
}

function visit(node: VNode, out: Target[], fix: (nodes: VNode[]) => void): void {
  const { type, props, children } = node
  if (type === Comment) return
  if (type === Text) out.push({ text: String(children), set: (text) => (node.children = text) })
  else if (type === Fragment && Array.isArray(children)) collect(children, out, fix)
  else if (type === Static) out.push({ text: OPAQUE, set: noop })
  else if (typeof type === 'string') {
    if (opaque(type, props)) out.push({ text: OPAQUE, set: noop })
    else if (typeof children === 'string') out.push({ text: children, set: (text) => (node.children = text) })
    else if (Array.isArray(children)) collect(children, out, fix)
  } else if (children && typeof children === 'object' && !Array.isArray(children)) {
    // A component renders its own slot later: fix that slot as a run of its own.
    const slots = children as Record<string, unknown>
    if (typeof slots.default === 'function') {
      const render = slots.default as (...args: unknown[]) => VNode[]
      node.children = { ...slots, default: (...args: unknown[]) => fixNodes(render(...args), fix) }
    }
    out.push({ text: OPAQUE, set: noop })
  }
}

function fixNodes(nodes: VNode[], fix: (nodes: VNode[]) => void): VNode[] {
  fix(nodes)
  return nodes
}

/**
 * Fixes the text of its default slot while rendering, so server HTML is already right
 * and hydration matches. With `html`, renders that HTML fixed inside `as`.
 */
export const Typo = defineComponent({
  name: 'Typo',
  props: {
    /** Language of the text, else the fixer's default locale. */
    locale: String,
    /** HTML to fix and render inside `as`, in place of the slot. */
    html: String,
    /** Element that receives `html`. */
    as: { type: [String, Object] as PropType<string | Component>, default: 'div' },
    /** A fixer with your settings, from `createTypo`. */
    typo: Object as PropType<Fixer>,
  },
  setup(props, { slots }) {
    const provided = useTypo()
    return () => {
      const typo = props.typo ?? provided
      if (props.html !== undefined) return h(props.as, { innerHTML: typo.html(props.html, props.locale) })
      const fix = (nodes: VNode[]) => {
        const targets: Target[] = []
        collect(nodes, targets, fix)
        if (!targets.length) return
        typo.parts(targets.map((t) => t.text), props.locale).forEach((text, i) => targets[i]!.set(text))
      }
      return fixNodes(slots.default?.() ?? [], fix)
    }
  },
})
