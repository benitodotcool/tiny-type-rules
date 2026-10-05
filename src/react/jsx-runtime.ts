import { Fragment, jsx as reactJsx, jsxs as reactJsxs } from 'react/jsx-runtime'

import { clientSettings } from './dispatcher.ts'
import { build } from './shared.ts'

export { Fragment }
export type { JSX } from 'react/jsx-runtime'

type Props = Record<string, unknown>

export const jsx = (type: unknown, props: Props, key?: unknown) => build(reactJsx as never, clientSettings(), type, props, key, [])
export const jsxs = (type: unknown, props: Props, key?: unknown) => build(reactJsxs as never, clientSettings(), type, props, key, [])
