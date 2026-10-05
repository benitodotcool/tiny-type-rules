// @ts-ignore `#app` only exists inside a Nuxt build.
import { defineNuxtPlugin } from '#app'

import { createTypo } from '../index.ts'
import type { DomNode } from '../tree.ts'
import { TYPO_KEY } from '../vue/index.ts'

type Config = { $config: { public: { typo: Parameters<typeof createTypo>[0] & { auto?: boolean } } } }
type NuxtApp = Config & { vueApp: { provide(key: unknown, value: unknown): void }; hook(name: string, fn: () => void): void }

export default defineNuxtPlugin({
  name: 'tiny-type-rules',
  setup(nuxtApp: NuxtApp) {
    const { auto, ...options } = nuxtApp.$config.public.typo
    const typo = createTypo(options)
    nuxtApp.vueApp.provide(TYPO_KEY, typo)
    const body = (globalThis as { document?: { body: DomNode } }).document?.body
    let stop: (() => void) | undefined
    // After hydration, so the page is fixed without a hydration mismatch; once, not per navigation.
    if (auto && body) nuxtApp.hook('app:suspense:resolve', () => void (stop ??= typo.watch(body)))
    return { provide: { typo } }
  },
})
