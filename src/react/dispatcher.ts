import * as React from 'react'

import { TTRContext } from './context.ts'
import type { Settings } from './shared.ts'

type Internals = { H?: unknown } | undefined
const internals = (React as unknown as Record<string, Internals>)
  .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE

/** Settings of the nearest provider while a component renders; none outside a render. */
export function clientSettings(): Settings | undefined {
  // `use` may run conditionally, but only during a render: check React is rendering first.
  if (internals && !internals.H) return undefined
  try {
    return React.use(TTRContext) ?? undefined
  } catch {
    return undefined
  }
}
