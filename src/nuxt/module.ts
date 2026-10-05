import { addImports, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'

import type { TypoOptions } from '../index.ts'
import { ttrTransform } from '../vue/index.ts'

export type ModuleOptions = TypoOptions & {
  /** Also fixes the whole page in the browser after hydration, and keeps it fixed. */
  auto?: boolean
}

/** Nuxt module: every template text is fixed while rendering. Settings under `ttr` in nuxt.config. */
export default defineNuxtModule<ModuleOptions>({
  meta: { name: 'tiny-type-rules', configKey: 'ttr' },
  defaults: { auto: false },
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const lang = nuxt.options.app.head.htmlAttrs?.lang
    nuxt.options.runtimeConfig.public.ttr = {
      locale: options.locale ?? (typeof lang === 'string' ? lang : undefined),
      locales: options.locales ?? {},
      auto: options.auto ?? false,
    }
    const compilerOptions = (nuxt.options.vue.compilerOptions ??= {}) as { nodeTransforms?: unknown[] }
    compilerOptions.nodeTransforms = [...(compilerOptions.nodeTransforms ?? []), ttrTransform]
    addPlugin(resolve('./plugin.js'))
    addImports({ name: 'useTTR', from: resolve('../vue/index.js') })
  },
})
