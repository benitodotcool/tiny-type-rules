# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-05

### Added

- French and English rules, on by default: spaces before punctuation, quotes and apostrophes, ellipsis.
- Opt-in rules: thousands separators, number and unit, abbreviations, dashes, last-word widows, literal replacements.
- `fixText`, `fixParts`, `fixHtml`, `fixPortableText`, `fixElement`, `watchElement` and the `tiny-type-rules/rehype` plugin.
- `createTypo` to set a default locale, override any setting per language, define regional variants and add languages.
- Scoping through `lang`, `data-ttr-lang`, `data-ttr-prevent` and `data-ttr`, in HTML and in the framework integrations.
- Next.js and React: a JSX runtime (`"jsxImportSource": "tiny-type-rules/react"`) and `TTRProvider` fix every text while rendering, in Server and Client Components, with one language per request.
- Nuxt and Vue: the `tiny-type-rules/nuxt` module and `ttrTransform` fix every template text while rendering, follow `@nuxtjs/i18n`, and take their settings under `ttr` in `nuxt.config`.
- Injected HTML and Portable Text passed as `value` are fixed before they render; `useTTR()` for any other text; an optional `auto` mode for the browser.

[Unreleased]: https://github.com/benitodotcool/tiny-type-rules/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/benitodotcool/tiny-type-rules/releases/tag/v0.1.0
