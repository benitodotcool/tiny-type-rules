# tiny-type-rules

[![npm](https://img.shields.io/npm/v/tiny-type-rules)](https://www.npmjs.com/package/tiny-type-rules)
[![CI](https://github.com/benitodotcool/tiny-type-rules/actions/workflows/ci.yml/badge.svg)](https://github.com/benitodotcool/tiny-type-rules/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/tiny-type-rules)](LICENSE)

Micro-typography for the web, in French and English: non-breaking spaces before `; : ! ?`, curly quotes and apostrophes, `« guillemets »`, thousands separators, numbers kept with their units, ellipses.

```js
import { fixText } from 'tiny-type-rules'

fixText('Il a dit : "C\'est l\'été !"', 'fr') // Il a dit : « C’est l’été ! »  (with the right spaces)
fixText('She said "it\'s fine" !', 'en')       // She said “it’s fine”!
```

- **Tiny and fast.** No dependency, under 7 kB gzipped before minification, a few microseconds per string.
- **Works everywhere.** Server first (SSR, static builds, edge), browser too. Plain text, HTML, Portable Text, rehype / MDX, live DOM.
- **Yours to tune.** Each language is a plain settings object. Change one character, turn a rule off, add a language.
- **Accessible by design.** Only swaps characters for their Unicode equivalents: no markup, no invisible characters, nothing that changes what a screen reader announces.
- **Safe on markup.** Tags, attributes, code, URLs and times are never touched. Running it twice changes nothing.

## Contents

- [Install](#install)
- [What it fixes](#what-it-fixes)
- [Usage](#usage): [text](#plain-text), [HTML](#html), [rich text](#rich-text-parts), [Portable Text](#portable-text-sanity), [rehype / MDX](#rehype-and-mdx), [DOM](#live-dom-browser)
- [HTML attributes](#html-attributes)
- [Settings](#settings)
- [Frameworks](#frameworks): [Nuxt and Vue](#nuxt-and-vue), [Next.js and React](#nextjs-and-react), [Astro and static sites](#astro-and-static-sites)
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
| Thousands               | `10 000`                | `10⋅000`                  |
| Number and unit         | `50 %`, `3 kg`          | `50·%`, `3·kg`            |
| Abbreviations           | `M. Dupont`, `n° 5`     | `M.·Dupont`, `n°·5`       |

### English (`en`)

| Rule                    | Before                  | After                     |
| ----------------------- | ----------------------- | ------------------------- |
| Double quotes           | `"Hello," she said`     | `“Hello,” she said`       |
| Single quotes           | `'quoted'`              | `‘quoted’`                |
| Apostrophes             | `it's`, `the '90s`      | `it’s`, `the ’90s`        |
| No space before `;:!?,` | `Wait ; what ?`         | `Wait; what?`             |
| Ellipsis                | `Well...`               | `Well…`                   |
| Number and unit         | `50 %`, `3 kg`          | `50·%`, `3·kg`            |
| Abbreviations           | `Mr. Smith`, `p. 12`    | `Mr.·Smith`, `p.·12`      |

Off by default, one setting away: dashes, last-word widows, free replacements such as `(c)` to `©`. See [Settings](#settings).

The French rules follow the _Lexique des règles typographiques en usage à l'Imprimerie nationale_: narrow no-break space before `; ! ?`, no-break space before `:` and inside guillemets.

Locales are matched on their language: `fr-FR`, `fr-CA` and `fr_BE` all get the French rules, unless you [define a variant](#a-regional-variant). Any other language is left untouched.

## Usage

### Plain text

```js
import { fixText } from 'tiny-type-rules'

fixText('Bonjour !', 'fr') // 'Bonjour !'
```

### HTML

```js
import { fixHtml } from 'tiny-type-rules'

fixHtml('<p>Il a dit : <em>"oui"</em> !</p>', 'fr')
// <p>Il a dit·: <em>«·oui·»</em>⋅!</p>
```

Rules see through inline tags (`a`, `em`, `strong`, `span`...) and comments, so `<em>oui</em> !` is fixed. Any other tag (`p`, `li`, `br`, `div`...) ends a run of text.

Left untouched: tags, attributes, comments, and the content of `code`, `pre`, `kbd`, `samp`, `var`, `tt`, `script`, `style`, `textarea`, `svg` and `math`. Entities are understood (`&nbsp;!` is fixed) and `&lt;`, `&gt;`, `&amp;` are never decoded, so text can never turn into markup.

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

Rewrites text nodes in place, never adds or removes a node. The `lang` and `data-*` attributes of the element's ancestors apply, so `<html lang="fr">` is enough. In an app driven by React or Vue, prefer fixing the data before render (see [Frameworks](#frameworks)): the framework may write its own text back on the next update.

## HTML attributes

Like `data-lenis-prevent` for Lenis, a few attributes scope the rules from your markup. They work in `fixHtml`, `fixElement` and the rehype plugin.

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
//   spaceInsideQuotes: ' ',
//   spaceBefore: { ',': '', ';': ' ', '!': ' ', '?': ' ', ':': ' ' },
//   thousandsSeparator: ' ',
//   unitSpace: ' ',
//   units: ['%', '€', 'kg', ...],
//   abbreviationSpace: ' ',
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
| `thousandsSeparator` | string                       | U+202F            | `false`           | Replaces a space typed between groups of three digits. Never inserted.           |
| `unitSpace`          | string                       | U+00A0            | U+00A0            | Replaces the space between a number and one of `units`.                          |
| `units`              | string[]                     | `UNITS`           | `UNITS`           | `%`, currencies, SI units, `px`...                                               |
| `abbreviationSpace`  | string                       | U+00A0            | U+00A0            | After one of `abbreviations`, before a word or a number.                         |
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
  locales: { fr: { spaceBefore: { '!': '<span class="bang"> </span>' } } },
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
    fr: { spaceBefore: { ':': false }, thousandsSeparator: false },
  },
})
```

### Opt-in rules

```js
createTypo({
  locales: {
    fr: {
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

**Fix the data before it renders.** Every function is pure: the same input gives the same output on the server and in the browser, so calling it during render causes no hydration mismatch. Rewriting the HTML after the render (a Nitro `render:html` hook, a proxy, a CDN) does not work with hydrated apps: Vue writes its own text back on hydration, and React reports a mismatch.

### Nuxt and Vue

Make one fixer for the app. In Nuxt, files in `app/utils/` are auto-imported:

```ts
// app/utils/typo.ts
import { createTypo } from 'tiny-type-rules'

export const typo = createTypo()
```

```vue
<script setup lang="ts">
const { locale } = useI18n() // or a constant
const { data: page } = await useAsyncData('page', () => $fetch('/api/page'), {
  transform: (page) => ({ ...page, body: typo.portableText(page.body, locale.value) }),
})
</script>

<template>
  <h1>{{ typo.text(page.title, locale) }}</h1>
  <PortableText :value="page.body" />
  <div v-html="typo.html(page.html, locale)" />
</template>
```

With a live data source (`useSanityQuery`), fix in a `computed` so updates stay reactive:

```ts
const body = computed(() => typo.portableText(data.value?.body ?? [], 'fr'))
```

### Next.js and React

In a Server Component, or a Client Component alike:

```tsx
import { fixHtml, fixPortableText, fixText } from 'tiny-type-rules'
import { PortableText } from '@portabletext/react'

export default async function Post({ params }) {
  const post = await getPost((await params).slug)
  return (
    <article lang="fr">
      <h1>{fixText(post.title, 'fr')}</h1>
      <PortableText value={fixPortableText(post.body, 'fr')} />
      <div dangerouslySetInnerHTML={{ __html: fixHtml(post.html, 'fr') }} />
    </article>
  )
}
```

MDX with `@next/mdx`. Turbopack needs plugins by name with serializable options, which `tiny-type-rules/rehype` supports:

```js
// next.config.mjs
const withMDX = createMDX({
  options: {
    rehypePlugins: [['tiny-type-rules/rehype', { locale: 'fr', locales: { fr: { widowSpace: ' ' } } }]],
  },
})
```

The same plugin works with `react-markdown` (`rehypePlugins={[[rehypeTinyTypeRules, { locale: 'fr' }]]}`). Pages Router: fix in `getStaticProps` or `getServerSideProps`.

### Astro and static sites

Pages without hydration can be fixed after render. In an Astro middleware:

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

The same goes for any static site generator, a build script, or an email template: pass the final HTML to `fixHtml` and let the `lang` attributes pick the rules.

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
createTypo({ locales: { fr: { spaceBefore: { ';': NBSP, '!': NBSP, '?': NBSP }, thousandsSeparator: NBSP } } })
```

## API

| Export                                          | Description                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `fixText(text, locale)`                         | Fixes a string. Unsupported locale: unchanged.                      |
| `fixParts(parts, locale)`                       | Fixes pieces of one text together, returns as many pieces.          |
| `fixHtml(html, locale?)`                        | Fixes the text of an HTML string.                                   |
| `fixPortableText(blocks, locale)`               | Fixes Portable Text blocks, returns new ones.                       |
| `fixElement(element, locale?)`                  | Fixes a live DOM element in place.                                  |
| `rehypeTinyTypeRules(options?)`                 | rehype plugin, also the default export of `tiny-type-rules/rehype`. |
| `createTypo({ locales })`                       | A fixer with your settings: `text`, `parts`, `html`, `portableText`, `element`, `hast`. |
| `fr`, `en`                                      | Built-in settings.                                                  |
| `NBSP`, `NNBSP`, `FIGURE_SPACE`, `THIN_SPACE`, `HAIR_SPACE`, `UNITS` | Characters and the default unit list.    |
| `LocaleConfig`, `TypoOptions`, `Typo`           | TypeScript types.                                                   |

## Compatibility

- ESM, with TypeScript types. `require('tiny-type-rules')` works in Node 20.19+ and 22.12+.
- Node 20 or later, every modern browser, Deno, Bun, edge runtimes. No Node API is used.
- Speed: about 8 µs per sentence, about 15 ms for 80 kB of HTML on a laptop.

## Versioning

[Semantic Versioning](https://semver.org). A changed output for the same input is part of the contract: a fix to a wrong output is a patch, a new rule, setting or language is a minor, and anything that breaks your code or your settings is a major. See the [changelog](CHANGELOG.md).

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md). Security issues: [SECURITY](SECURITY.md).

## License

[MIT](LICENSE). Free for any use, personal or commercial.

---

Made by [Brun Network®](https://brun.network).
