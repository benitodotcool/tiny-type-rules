# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-05

### Added

- French and English rules, on by default: spaces before punctuation, quotes and apostrophes, ellipsis.
- Opt-in rules: thousands separators, number and unit, abbreviations, dashes, last-word widows, literal replacements.
- `fixText`, `fixParts`, `fixHtml`, `fixPortableText`, `fixElement`, `watchElement` and the `tiny-type-rules/rehype` plugin.
- `createTypo` to set a default locale, override any setting per language, define regional variants and add languages.
- HTML scoping through `lang`, `data-ttr-lang`, `data-prevent-ttr` and `data-ttr`.
- `tiny-type-rules/react` for Next.js and React: `Typo`, `defineTypo`, `TypoProvider` with an `auto` mode, `useTypo`.
- `tiny-type-rules/vue` and the `tiny-type-rules/nuxt` module: `Typo`, `TypoPlugin`, `useTypo`, settings in `nuxt.config`.

[Unreleased]: https://github.com/benitodotcool/tiny-type-rules/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/benitodotcool/tiny-type-rules/releases/tag/v0.1.0
