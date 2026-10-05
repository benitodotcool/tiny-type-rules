# Contributing

Thanks for helping. Issues and pull requests are welcome, in English.

## Setup

Node 22 or later.

```sh
npm install
npm test        # unit tests, straight on the TypeScript sources
npm run check   # typecheck, tests, build, package lint (publint, arethetypeswrong)
```

## Ground rules

- **No runtime dependency.** The package must stay dependency-free and small.
- **Characters, never markup.** Rules only swap characters for their Unicode equivalents. No `<span>`, no soft hyphen, no zero-width character by default: they change what screen readers announce and what people copy.
- **Idempotent.** Fixing already fixed text must not change it. Every rule test also runs twice.
- **Leave machine text alone.** URLs, times, code and attributes must survive untouched. Add a test when a rule could match them.
- **A rule is a setting.** Every behavior lives in a locale config (`src/locales/*.ts`) and can be changed or turned off by users.

## Adding a language

1. Create `src/locales/<code>.ts` exporting a `LocaleConfig`, with a one-line JSDoc naming the reference the rules come from.
2. Register it in `BUILT_IN` (`src/index.ts`) and export it.
3. Add its cases to `test/text.test.js`, with sources for anything debatable in the pull request.

## Commits

Conventional commits: `type(scope): what changed`, imperative, lowercase, no period (`feat(fr): add a space before the percent sign`). Types: feat, fix, refactor, docs, test, chore, ci.

## Releases

Maintainers only. Versions follow [Semantic Versioning](https://semver.org): a fix to a wrong output is a patch, a new rule, setting or language is a minor, an API change is a major. While in `0.x`, breaking changes bump the minor.

1. Move the `Unreleased` notes of `CHANGELOG.md` under the new version.
2. `npm version patch|minor|major` (commits `chore(release): vX.Y.Z` and tags it).
3. `git push --follow-tags`. The `Publish` workflow tests, publishes to npm with provenance and creates the GitHub release.
