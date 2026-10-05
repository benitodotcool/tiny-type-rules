import { Fragment, jsx as reactJsx, jsxs as reactJsxs } from 'react/jsx-runtime'

import { build } from './shared.ts'
import { requestSettings } from './store.ts'

export { Fragment }

type Props = Record<string, unknown>

export const jsx = (type: unknown, props: Props, key?: unknown) =>
  build(reactJsx as never, requestSettings().current, type, props, key, [])
export const jsxs = (type: unknown, props: Props, key?: unknown) =>
  build(reactJsxs as never, requestSettings().current, type, props, key, [])
