import { Fragment, jsxDEV as reactJsxDEV } from 'react/jsx-dev-runtime'

import { build } from './shared.ts'
import { requestSettings } from './store.ts'

export { Fragment }

export const jsxDEV = (type: unknown, props: Record<string, unknown>, key: unknown, ...rest: unknown[]) =>
  build(reactJsxDEV as never, requestSettings().current, type, props, key, rest)
