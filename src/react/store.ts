import { cache } from 'react'

import type { Settings } from './shared.ts'

/** Settings of the current request, for Server Components, which cannot read context. */
export const requestSettings = cache((): { current?: Settings } => ({}))
