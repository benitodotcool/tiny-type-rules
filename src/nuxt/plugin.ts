// @ts-ignore `#app` only exists inside a Nuxt build.
import { defineNuxtPlugin } from '#app'

import { createTypo, type TypoOptions } from '../index.ts'
import type { DomNode } from '../tree.ts'
import { TTRPlugin } from '../vue/index.ts'

type NuxtApp = {
  $config: { public: { ttr: TypoOptions & { auto?: boolean } } }
  $i18n?: { locale?: { value?: string } }
  vueApp: { use(plugin: unknown, options: unknown): void }
  hook(name: string, fn: () => void): void
}

export default defineNuxtPlugin({
  name: 'tiny-type-rules',
  setup(nuxtApp: NuxtApp) {
    const { auto, locale, locales } = nuxtApp.$config.public.ttr
    // With @nuxtjs/i18n, the rules follow the current language.
    const getLocale = () => nuxtApp.$i18n?.locale?.value ?? locale
    nuxtApp.vueApp.use(TTRPlugin, { locale, locales, getLocale })
    const body = (globalThis as { document?: { body: DomNode } }).document?.body
    if (!auto || !body) return
    let watching = false
    // After hydration, so the page is fixed without a hydration mismatch; once, not per navigation.
    nuxtApp.hook('app:suspense:resolve', () => {
      if (watching) return
      watching = true
      createTypo({ locales }).watch(body, getLocale())
    })
  },
})
