import { Children, cloneElement, createElement, isValidElement, type ElementType, type ReactNode } from 'react'

import { createTypo, type Typo as Fixer, type TypoOptions } from '../index.ts'
import { OPAQUE, SKIP } from '../scope.ts'

const builtIn = createTypo()

export type TypoProps = {
  children?: ReactNode
  /** Language of the text, else the fixer's default locale. */
  locale?: string
  /** HTML to fix and render inside `as`, in place of children. */
  html?: string
  /** Element that receives `html`. Default: `div`. */
  as?: ElementType
  /** A fixer with your settings, from `createTypo`. */
  typo?: Fixer
} & Record<string, unknown>

type Props = { children?: ReactNode; lang?: unknown; 'data-ttr-lang'?: unknown; 'data-prevent-ttr'?: unknown }

// Code, another language or an opted-out element: the rules see a word there, never inside.
const opaque = (type: unknown, props: Props) =>
  (typeof type === 'string' && SKIP.has(type)) ||
  props['data-prevent-ttr'] != null ||
  props.lang != null ||
  props['data-ttr-lang'] != null ||
  typeof props.children === 'function'

function collect(node: ReactNode, parts: string[]): void {
  Children.forEach(node, (child) => {
    if (typeof child === 'string' || typeof child === 'number') parts.push(String(child))
    else if (isValidElement<Props>(child)) {
      if (opaque(child.type, child.props)) parts.push(OPAQUE)
      else collect(child.props.children, parts)
    }
  })
}

function rebuild(node: ReactNode, fixed: string[], cursor: { i: number }): ReactNode {
  const out = Children.map(node, (child) => {
    if (typeof child === 'string' || typeof child === 'number') return fixed[cursor.i++]
    if (!isValidElement<Props>(child)) return child
    if (opaque(child.type, child.props)) {
      cursor.i++
      return child
    }
    if (child.props.children === undefined) return child
    return cloneElement(child, { children: rebuild(child.props.children, fixed, cursor) })
  })
  return out?.length === 1 && typeof out[0] === 'string' ? out[0] : out
}

/**
 * Fixes the text of its children while rendering, so server HTML is already right.
 * Works in Server Components. Text rendered inside a child component is out of its reach.
 */
export function Typo({ children, locale, html, as = 'div', typo = builtIn, ...rest }: TypoProps): ReactNode {
  if (html !== undefined) return createElement(as, { ...rest, dangerouslySetInnerHTML: { __html: typo.html(html, locale) } })
  const parts: string[] = []
  collect(children, parts)
  if (!parts.length) return children
  return rebuild(children, typo.parts(parts, locale), { i: 0 })
}

/** A `Typo` bound to your settings, for Server Components that cannot read the provider. */
export function defineTypo(options: TypoOptions = {}) {
  const typo = createTypo(options)
  const BoundTypo = (props: Omit<TypoProps, 'typo'>) => createElement(Typo, { ...props, typo })
  return { Typo: BoundTypo, typo }
}
