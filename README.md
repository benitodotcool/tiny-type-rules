# tiny-type-rules

[![npm](https://img.shields.io/npm/v/tiny-type-rules)](https://www.npmjs.com/package/tiny-type-rules)
[![CI](https://github.com/benitodotcool/tiny-type-rules/actions/workflows/ci.yml/badge.svg)](https://github.com/benitodotcool/tiny-type-rules/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/tiny-type-rules)](LICENSE)

Micro-typography for the web, in French and English: non-breaking spaces before `; : ! ?`, curly quotes and apostrophes, `« guillemets »`, ellipses.

```js
import { fixText } from 'tiny-type-rules'

fixText('Il a dit : "C\'est l\'été !"', 'fr') // Il a dit : « C’est l’été ! »  (with the right spaces)
fixText('She said "it\'s fine" !', 'en')       // She said “it’s fine”!
```

- **Tiny and fast.** No dependency, under 9 kB gzipped before minification, a few microseconds per string.
- **Works everywhere.** Server first (SSR, static builds, edge), browser too. Plain text, HTML, Portable Text, rehype / MDX, live DOM, with ready-made components for Next.js, Nuxt, React and Vue.
- **Yours to tune.** Each language is a plain settings object. Change one character, turn a rule off, add a language.
- **Accessible by design.** Only swaps characters for their Unicode equivalents: no markup, no invisible characters, nothing that changes what a screen reader announces.
- **Safe on markup.** Tags, attributes and code are never touched, the spacing rules leave URLs, times and emails alone, and running it twice changes nothing.

## Contents

- [Install](#install)
- [What it fixes](#what-it-fixes)
- [Usage](#usage): [text](#plain-text), [HTML](#html), [rich text](#rich-text-parts), [Portable Text](#portable-text-sanity), [rehype / MDX](#rehype-and-mdx), [DOM](#live-dom-browser)
- [HTML attributes](#html-attributes)
- [Settings](#settings)
- [Frameworks](#frameworks): [Next.js](#nextjs), [Nuxt](#nuxt), [Vue](#vue), [any other site](#any-other-site)
- [Accessibility](#accessibility)
- [Fonts](#fonts)
- [API](#api)
- [Compatibility](#compatibility)

## Install

```sh
npm install tiny-type-rules
```

## What it fixes

In the tables, `·` stands for a no-break space (U+00A0) and `⋅` for a narrow no-break space (U+202F). Both look like ordinary spaces once rendered, but a line never wraps on them.

### French (`fr`)

| Rule                    | Before                  | After                     |
| ----------------------- | ----------------------- | ------------------------- |
| Before `; ! ?`          | `Vraiment ? Oui !`      | `Vraiment⋅? Oui⋅!`        |
| Before `:`              | `Note : ceci`           | `Note·: ceci`             |
| No space before `,`     | `Oui , non`             | `Oui, non`                |
| Quotes                  | `"Bonjour"`             | `«·Bonjour·»`             |
| Nested quotes           | `« Il a dit "oui" »`    | `«·Il a dit “oui”·»`      |
| Apostrophe              | `l'été`                 | `l’été`                   |
| Ellipsis                | `Et puis...`            | `Et puis…`                |

### English (`en`)

| Rule                    | Before                  | After                     |
| ----------------------- | ----------------------- | ------------------------- |
| Double quotes           | `"Hello," she said`     | `“Hello,” she said`       |
| Single quotes           | `'quoted'`              | `‘quoted’`                |
| Apostrophes             | `it's`, `the '90s`      | `it’s`, `the ’90s`        |
| No space before `;:!?,` | `Wait ; what ?`         | `Wait; what?`             |
| Ellipsis                | `Well...`               | `Well…`                   |

### Off by default

One setting away (see [Settings](#settings)). The space rules below never change a visible character: they swap a space you typed for a no-break one, so the line never wraps there.

| Rule              | Setting              | Before                         | After                            |
| ----------------- | -------------------- | ------------------------------ | -------------------------------- |
| Thousands         | `thousandsSeparator` | `10 000`                       | `10⋅000`                         |
| Number and unit   | `unitSpace`          | `50 %`, `3 kg`                 | `50·%`, `3·kg`                   |
| Abbreviations     | `abbreviationSpace`  | `M. Dupont`, `n° 5`, `p. 12`   | `M.·Dupont`, `n°·5`, `p.·12`     |
| Dashes            | `dash`               | `a - b`                        | `a – b`                          |
| Last-word widows  | `widowSpace`         | `the last word`                | `the last·word`                  |
| Free replacements | `replacements`       | `(c)`                          | `©`                              |

Units and abbreviations come from a list, and a short entry can match a word that only looks like one (`Groupe 2 A`, `Me voilà`): the text still reads the same, but the line can no longer wrap there.

The French rules follow the _Lexique des règles typographiques en usage à l'Imprimerie nationale_: narrow no-break space before `; ! ?`, no-break space before `:` and inside guillemets.

Locales are matched on their language: `fr-FR`, `fr-CA` and `fr_BE` all get the French rules, unless you [define a variant](#a-regional-variant). Any other language is left untouched.

## Usage

### Plain text

```js
import { fixText } from 'tiny-type-rules'

fixText('Bonjour !', 'fr') // 'Bonjour\u202F!'
```

### HTML

```js
import { fixHtml } from 'tiny-type-rules'

fixHtml('<p>Il a dit : <em>"oui"</em> !</p>', 'fr')
// <p>Il a dit·: <em>«·oui·»</em>⋅!</p>
```

Rules see through inline tags (`a`, `em`, `strong`, `span`...) and comments, so `<em>oui</em> !` is fixed. Any other tag (`p`, `li`, `br`, `div`...) ends a run of text.

Left untouched: tags, attributes, comments, and the content of `code`, `pre`, `kbd`, `samp`, `var`, `tt`, `script`, `style`, `textarea`, `template`, `svg` and `math`. Inline `code`, `kbd`, `samp`, `var` and `tt` count as a word: rules see around them (`"<code>npm</code>"` gets its guillemets) but never change them.

The parser reads tags the way a browser does, stray quotes and optional end tags (`<p>`, `<li>`, `<td>`...) included. Entities are understood (`&nbsp;!`, `caf&eacute;`, `50 &euro;`), and text a rule leaves alone is written back exactly as it was, entities included. `&lt;` and `&amp;` are never decoded, and a `<` or `&` typed as text is escaped whenever its sentence changes, so text can never turn into markup.

The `lang` attributes of the document win over the `locale` argument, which is the fallback. Without either, the HTML comes back unchanged:

```js
fixHtml('<html lang="fr">...</html>') // French rules, from the lang attribute
```

### Rich text parts

When a text is split into pieces (spans of a rich text editor), fix the pieces together so the rules see across them. You get back as many pieces as you gave:

```js
import { fixParts } from 'tiny-type-rules'

fixParts(['Il a dit ', '"oui"', ' !'], 'fr')
// ['Il a dit ', '«·oui·»', '⋅!']
```

### Portable Text (Sanity)

```js
import { fixPortableText } from 'tiny-type-rules'

const body = fixPortableText(page.body, 'fr')
```

Returns new blocks and leaves the input alone. Spans of a block are fixed together; spans marked `code` and blocks that are not `_type: 'block'` (images, code blocks, custom objects) are left untouched.

### rehype and MDX

```js
import rehypeTinyTypeRules from 'tiny-type-rules/rehype'

unified().use(remarkParse).use(remarkRehype).use(rehypeTinyTypeRules, { locale: 'fr' }).use(rehypeStringify)
```

Same rules and [attributes](#html-attributes) as `fixHtml`, MDX components included (`<Note data-prevent-ttr>`). Options: `locale`, `locales` ([settings](#settings), serializable) or `typo` (an instance from `createTypo`).

### Live DOM (browser)

```js
import { fixElement } from 'tiny-type-rules'

fixElement(document.querySelector('main'))
```

Rewrites text nodes in place, never adds or removes a node. The `lang` and `data-*` attributes of the element's ancestors apply, so `<html lang="fr">` is enough.

To keep a page fixed while its content changes, watch it instead. Each change fixes the paragraph it belongs to, batched, and the returned function stops watching:

```js
import { watchElement } from 'tiny-type-rules'

const stop = watchElement(document.body)
```

In a React or Vue app, the [framework components](#frameworks) do this for you after hydration.

## HTML attributes

A few attributes scope the rules from your markup. They work in `fixHtml`, `fixElement` and the rehype plugin.

| Attribute              | Effect                                                                     |
| ---------------------- | -------------------------------------------------------------------------- |
| `data-prevent-ttr`     | Leaves the element and its descendants untouched.                         |
| `data-ttr`             | Turns the rules back on inside a prevented element or a `pre` / `code`.   |
| `data-ttr-lang="en"`   | Rules of this language for the element, without changing its `lang`.     |
| `lang="fr"`            | Rules of this language for the element. Unsupported language: untouched. |

```html
<article lang="fr">
  <p>Corrigé !</p>
  <p data-prevent-ttr>Laissé tel quel !</p>
  <div data-prevent-ttr>
    <p>Pas corrigé !</p>
    <p data-ttr>Corrigé à nouveau !</p>
  </div>
  <blockquote lang="en">"Fixed in English," she said.</blockquote>
  <pre data-ttr>Corrigé, même dans un pre !</pre>
</article>
```

## Settings

Each language is a settings object, and you can read the built-in ones:

```js
import { fr } from 'tiny-type-rules'

console.log(fr)
// {
//   quotes: ['«', '»', '“', '”'],
//   singleQuotes: false,
//   apostrophe: '’',
//   ellipsis: '…',
//   spaceInsideQuotes: '\u00A0',
//   spaceBefore: { ',': '', ';': '\u202F', '!': '\u202F', '?': '\u202F', ':': '\u00A0' },
//   thousandsSeparator: false,
//   unitSpace: false,
//   units: ['%', '€', 'kg', ...],
//   abbreviationSpace: false,
//   abbreviations: ['M.', 'Mme', 'n°', ...],
//   dash: false,
//   widowSpace: false,
//   replacements: {},
// }
```

`createTypo` makes a fixer with your own settings, merged over the built-in ones:

```js
import { createTypo, NBSP } from 'tiny-type-rules'

export const typo = createTypo({
  locales: {
    fr: { widowSpace: NBSP },
  },
})

typo.text('Bonjour !', 'fr')
typo.html(html, 'fr')
typo.parts(parts, 'fr')
typo.portableText(blocks, 'fr')
typo.element(document.body)
typo.hast(tree, 'fr')
```

Every value follows the same convention: **a string** replaces (inserting the space when it is missing), **`''`** removes, **`false`** leaves the text as typed.

| Setting              | Type                         | `fr`              | `en`              | What it does                                                                     |
| -------------------- | ---------------------------- | ----------------- | ----------------- | -------------------------------------------------------------------------------- |
| `quotes`             | `[open, close, open, close]` | `« » “ ”`         | `“ ” ‘ ’`         | Straight `"`, outer then nested, like the CSS `quotes` property.                 |
| `singleQuotes`       | `[open, close]`              | `false`           | `‘ ’`             | Straight `'` used as quotes. When `false`, every `'` is an apostrophe.           |
| `apostrophe`         | string                       | `’`               | `’`               | `'` inside a word and before decades (`’90s`).                                   |
| `ellipsis`           | string                       | `…`               | `…`               | Three dots.                                                                      |
| `spaceInsideQuotes`  | string                       | U+00A0            | `false`           | Right inside the outer quotes.                                                   |
| `spaceBefore`        | `{ [mark]: string }`         | see above         | all `''`          | Before each punctuation mark. Merged key by key.                                 |
| `thousandsSeparator` | string                       | `false`           | `false`           | Replaces a space typed between groups of three digits. Never inserted.           |
| `unitSpace`          | string                       | `false`           | `false`           | Replaces the space between a number and one of `units`.                          |
| `units`              | string[]                     | `UNITS`           | `UNITS`           | `%`, currencies, SI units, `px`...                                               |
| `abbreviationSpace`  | string                       | `false`           | `false`           | After one of `abbreviations`, before a word or a number.                         |
| `abbreviations`      | string[]                     | `M.`, `Mme`, `n°` | `Mr.`, `Dr.`, `p.` | Titles and references.                                                           |
| `dash`               | string                       | `false`           | `false`           | Replaces a hyphen typed between spaces (`a - b`, `a -- b`).                      |
| `widowSpace`         | string                       | `false`           | `false`           | Before the last word of a paragraph, so it never ends a line alone.              |
| `replacements`       | `{ [from]: to }`             | `{}`              | `{}`              | Literal replacements, run first. Merged key by key.                              |

Objects (`spaceBefore`, `replacements`) merge key by key; arrays (`units`, `abbreviations`) replace the built-in list, so spread it to extend: `units: [...fr.units, 'pc']`.

### Change the width of a space

The space before `!` in French is a narrow no-break space. Pick another one:

```js
import { createTypo, NBSP, FIGURE_SPACE } from 'tiny-type-rules'

createTypo({ locales: { fr: { spaceBefore: { '!': NBSP, '?': NBSP } } } })
```

Only three Unicode spaces never wrap, from narrow to wide: `NNBSP` (U+202F), `NBSP` (U+00A0), `FIGURE_SPACE` (U+2007, the width of a digit). `THIN_SPACE` and `HAIR_SPACE` are exported too, but a line can break on them.

### Creative spacing

Any string works, markup included, for output that ends up as HTML (`typo.html`, or a string you render as HTML). Size it in CSS:

```js
const typo = createTypo({
  locales: { fr: { spaceBefore: { '!': '<span class="bang">\u202F</span>' } } },
})
typo.html('<p>Oui !</p>', 'fr') // <p>Oui<span class="bang"> </span>!</p>
```

```css
.bang { margin-inline-start: 0.5em; }
```

Keep the span inline (no `inline-block`, which allows a line break), and fix a given HTML only once: markup values are not idempotent. In `fixText`, `fixParts`, Portable Text or the DOM, the markup would show as text.

### Turn rules off

```js
createTypo({
  locales: {
    en: { quotes: false, singleQuotes: false, apostrophe: false }, // keep straight quotes
    fr: { spaceBefore: { ':': false }, spaceInsideQuotes: false },
  },
})
```

### Turn on the rules that are off by default

```js
import { createTypo, NBSP, NNBSP } from 'tiny-type-rules'

createTypo({
  locales: {
    fr: {
      thousandsSeparator: NNBSP,                    // 10 000 keeps together
      unitSpace: NBSP,                              // 3 kg keeps together
      abbreviationSpace: NBSP,                      // M. Dupont keeps together
      dash: '–',                                    // a - b becomes a – b
      widowSpace: NBSP,                             // no lone last word
      replacements: { '(c)': '©', '(tm)': '™', '->': '→' },
    },
  },
})
```

### A regional variant

A region tag starts from its language, including your own changes to it. Swiss French, for instance, also uses a narrow space before the colon:

```js
createTypo({ locales: { 'fr-CH': { spaceBefore: { ':': NNBSP } } } })
```

### A new language

An unknown tag adds a language. Start from scratch, or from a built-in one:

```js
import { createTypo, en } from 'tiny-type-rules'

createTypo({
  locales: {
    de: { quotes: ['„', '“', '‚', '‘'], apostrophe: '’', ellipsis: '…' },
    nl: { ...en, quotes: ['“', '”', '‘', '’'] },
  },
})
```

Built your language and checked it against a reference? A pull request is welcome, see [CONTRIBUTING](CONTRIBUTING.md).

## Frameworks

Two ways to use it, and they combine:

- **`<Typo>`, at render.** Wrap the text that comes from your data. The HTML your server sends is already right, and since the same input always gives the same output, the browser renders the same text: no hydration mismatch.
- **`auto` mode, in the browser.** One switch fixes the whole page once it is hydrated, then every text that changes or appears. Nothing to wrap, but the HTML your server sends is not fixed, and the text can shift a moment after load. Use it as a safety net, or for content you do not control.

`<Typo>` takes the same props in React and Vue:

| Prop                 | Description                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| children / slot      | The text to fix, inline elements and child components included.                      |
| `locale`             | Language of the text. Default: the locale of your settings.                          |
| `html`               | An HTML string to fix and render, in place of children.                              |
| `as`                 | The element that receives `html`. Default: `div`.                                    |
| `typo`               | A fixer from `createTypo`, for settings of its own.                                  |

`<Typo>` sees the text you write inside it, through inline elements and into the children you pass to other components (`<Link>Home !</Link>`). Text that a component renders on its own (`<Article />`) is out of its reach: wrap the text inside that component, or turn on `auto`. Inline `code`, an element with another `lang`, and `data-prevent-ttr` are left untouched.

### Next.js

Tested with Next.js 16 (App Router). Server Components cannot read React context, so the settings live in a small module that both sides import:

```ts
// app/typo.ts
import { defineTypo } from 'tiny-type-rules/react'

export const settings = { locale: 'fr', locales: { fr: { widowSpace: '\u00A0' } } }
export const { Typo, typo } = defineTypo(settings)
```

```tsx
// app/layout.tsx
import { TypoProvider } from 'tiny-type-rules/react'
import { settings } from './typo'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <TypoProvider {...settings} auto>
          {children}
        </TypoProvider>
      </body>
    </html>
  )
}
```

```tsx
// app/blog/[slug]/page.tsx, a Server Component
import { PortableText } from '@portabletext/react'
import { Typo, typo } from '../../typo'

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug)
  return (
    <article>
      <h1><Typo>{post.title}</Typo></h1>
      <Typo as="div" html={post.html} />
      <PortableText value={typo.portableText(post.body)} />
    </article>
  )
}
```

In a Client Component, `useTypo()` returns the fixer of the provider:

```tsx
'use client'
import { useTypo } from 'tiny-type-rules/react'

export function Caption({ text }: { text: string }) {
  return <figcaption>{useTypo().text(text)}</figcaption>
}
```

Leave out `auto` to fix only what you wrap. With the Pages Router, put `TypoProvider` in `_app.tsx`; `Typo` works the same.

MDX with `@next/mdx`. Turbopack needs plugins by name with serializable options, which `tiny-type-rules/rehype` supports:

```js
// next.config.mjs
const withMDX = createMDX({
  options: {
    rehypePlugins: [['tiny-type-rules/rehype', { locale: 'fr', locales: { fr: { widowSpace: '\u00A0' } } }]],
  },
})
```

The same plugin works with `react-markdown`: `rehypePlugins={[[rehypeTinyTypeRules, { locale: 'fr' }]]}`.

### Nuxt

Tested with Nuxt 4. The module reads its settings from `typo` in `nuxt.config`, and auto-imports `<Typo>` and `useTypo()`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['tiny-type-rules/nuxt'],
  app: { head: { htmlAttrs: { lang: 'fr' } } },
  typo: {
    auto: true,
    locales: { fr: { widowSpace: '\u00A0' } },
  },
})
```

`typo` takes `locale`, `locales` and `auto`, all optional. Without `locale`, the module uses `app.head.htmlAttrs.lang`.

```vue
<script setup lang="ts">
const typo = useTypo()
const { data: page } = await useAsyncData('page', () => $fetch('/api/page'))
</script>

<template>
  <h1><Typo>{{ page.title }}</Typo></h1>
  <Typo as="section" :html="page.html" />
  <PortableText :value="typo.portableText(page.body)" />
</template>
```

With a live data source (`useSanityQuery`), fix in a `computed` so updates stay reactive: `computed(() => typo.portableText(data.value?.body ?? []))`. A site in several languages passes the current one: `<Typo :locale="locale">`.

### Vue

Without Nuxt, install the plugin and register the component:

```ts
import { createApp } from 'vue'
import { Typo, TypoPlugin } from 'tiny-type-rules/vue'

createApp(App).use(TypoPlugin, { locale: 'fr', auto: true }).component('Typo', Typo).mount('#app')
```

### Any other site

In the browser, `watchElement(document.body)` fixes the page and keeps it fixed, with the `lang` attributes of the page.

Pages without hydration can also be fixed on the server, after render. In an Astro middleware:

```ts
// src/middleware.ts
import { fixHtml } from 'tiny-type-rules'

export const onRequest = async (context, next) => {
  const response = await next()
  if (!response.headers.get('content-type')?.includes('text/html')) return response
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  return new Response(fixHtml(await response.text()), { status: response.status, headers })
}
```

The same goes for a static site generator, a build script or an email template: pass the final HTML to `fixHtml`. Do not do this for a hydrated app (a Nitro `render:html` hook, a proxy, a CDN rewrite): Vue writes its own text back on hydration, and React reports a mismatch.

## Accessibility

- **Characters, never markup.** Every rule swaps a character for its Unicode equivalent. No `<span>` around punctuation (VoiceOver on iOS reads split text piece by piece), no soft hyphen (some screen readers then misspell the word), no zero-width character (it breaks search and copy).
- **Spaces stay spaces.** Screen readers handle no-break spaces as ordinary whitespace (NVDA names U+00A0 only when spelling character by character), and curly quotes, `«»` and `…` are not announced at NVDA's default punctuation level.
- **`lang` is the source of truth.** The `lang` attribute you already set for screen readers and hyphenation also picks the rules, and text in a language the library does not know is left alone rather than fixed with the wrong rules.
- **Nothing hidden from assistive tech is touched**, and nothing is added: `alt`, `title` and `aria-*` attributes are left as written.
- **Thousands separators** are never inserted, only swapped for a narrow space where you typed one, so `10000` stays a single number for screen readers.

For hyphenation and balanced lines, prefer CSS: `hyphens: auto` with the right `lang`, `text-wrap: balance` for headings, `text-wrap: pretty` for paragraphs.

## Fonts

The narrow no-break space (U+202F) is missing from many web fonts, and from most Google Fonts files, even when the original font has it. The browser then draws that single character with a fallback font: still a narrow, unbreakable space, but its width comes from the fallback. If that matters for your design, self-host a font file that keeps U+202F, or switch to a no-break space:

```js
createTypo({ locales: { fr: { spaceBefore: { ';': NBSP, '!': NBSP, '?': NBSP } } } })
```

## API

| Export                                          | Description                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `fixText(text, locale)`                         | Fixes a string. Unsupported locale: unchanged.                      |
| `fixParts(parts, locale)`                       | Fixes pieces of one text together, returns as many pieces.          |
| `fixHtml(html, locale?)`                        | Fixes the text of an HTML string.                                   |
| `fixPortableText(blocks, locale)`               | Fixes Portable Text blocks, returns new ones.                       |
| `fixElement(element, locale?)`                  | Fixes a live DOM element in place.                                  |
| `watchElement(element, locale?)`                | Fixes a live DOM element, then on every change. Returns `stop()`.   |
| `rehypeTinyTypeRules(options?)`                 | rehype plugin, also the default export of `tiny-type-rules/rehype`. |
| `createTypo({ locale, locales })`               | A fixer with your settings and default locale: `text`, `parts`, `html`, `portableText`, `element`, `watch`, `hast`. |
| `fr`, `en`                                      | Built-in settings.                                                  |
| `NBSP`, `NNBSP`, `FIGURE_SPACE`, `THIN_SPACE`, `HAIR_SPACE`, `UNITS` | Characters and the default unit list.    |
| `LocaleConfig`, `TypoOptions`, `Typo`           | TypeScript types.                                                   |

| Entry point               | Exports                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `tiny-type-rules/react`   | `Typo`, `defineTypo(settings)`, `TypoProvider` (`auto`, `locale`, `locales`), `useTypo()` |
| `tiny-type-rules/vue`     | `Typo`, `TypoPlugin` (`auto`, `locale`, `locales`), `useTypo()`, `TYPO_KEY`           |
| `tiny-type-rules/nuxt`    | The Nuxt module, configured under `typo` in `nuxt.config`                             |
| `tiny-type-rules/rehype`  | The rehype plugin, as default export                                                 |

## Compatibility

- ESM, with TypeScript types. `require('tiny-type-rules')` works in Node 20.19+ and 22.12+.
- Node 20 or later, every modern browser, Deno, Bun, edge runtimes. No Node API is used.
- The framework entry points need what your app already has: React 18+, Vue 3.3+, Nuxt 3.10+. Tested with Next.js 16 and Nuxt 4, server rendering and hydration included.
- Speed: 3 to 8 µs per sentence, about 20 ms for 80 kB of HTML on a laptop. Linear on any input, malformed HTML included.

## Versioning

[Semantic Versioning](https://semver.org). A changed output for the same input is part of the contract: a fix to a wrong output is a patch, a new rule, setting or language is a minor, and anything that breaks your code or your settings is a major. See the [changelog](CHANGELOG.md).

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md). Security issues: [SECURITY](SECURITY.md).

## License

[MIT](LICENSE). Free for any use, personal or commercial.

---

Made by [Brun Network®](https://brun.network).
