import { addComponent, addImports, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'

import type { TypoOptions } from '../index.ts'

export type ModuleOptions = TypoOptions & {
  /** Also fixes the whole page in the browser after hydration, and keeps it fixed. */
  auto?: boolean
}

/** Nuxt module: settings under `typo` in nuxt.config, `<Typo>` and `useTypo()` auto-imported. */
export default defineNuxtModule<ModuleOptions>({
  meta: { name: 'tiny-type-rules', configKey: 'typo' },
  defaults: { auto: false },
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const lang = nuxt.options.app.head.htmlAttrs?.lang
    nuxt.options.runtimeConfig.public.typo = {
      locale: options.locale ?? (typeof lang === 'string' ? lang : undefined),
      locales: options.locales ?? {},
      auto: options.auto ?? false,
    }
    addPlugin(resolve('./plugin.js'))
    addComponent({ name: 'Typo', export: 'Typo', filePath: resolve('../vue/index.js') })
    addImports({ name: 'useTypo', from: resolve('../vue/index.js') })
  },
})
