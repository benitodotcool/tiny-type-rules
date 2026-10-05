import { Fragment, jsxDEV as reactJsxDEV } from 'react/jsx-dev-runtime'

import { clientSettings } from './context.ts'
import { build } from './shared.ts'

export { Fragment }
export type { JSX } from 'react/jsx-dev-runtime'

export const jsxDEV = (type: unknown, props: Record<string, unknown>, key: unknown, ...rest: unknown[]) =>
  build(reactJsxDEV as never, clientSettings(), type, props, key, rest)
