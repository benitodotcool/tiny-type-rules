import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createTypo, fr, NNBSP, THIN_SPACE } from '../src/index.ts'

const nb = (s) => s.replaceAll('~', ' ').replaceAll('^', ' ')

test('overrides one setting and keeps the others', () => {
  const typo = createTypo({ locales: { fr: { spaceBefore: { '!': THIN_SPACE } } } })
  assert.equal(typo.text('Oui ! Non ?', 'fr'), nb(`Oui${THIN_SPACE}! Non^?`))
})

test('false leaves the text as typed, an empty string removes', () => {
  const typo = createTypo({ locales: { fr: { quotes: false, spaceBefore: { ':': false, '?': '' } } } })
  assert.equal(typo.text('"Note : oui ?"', 'fr'), '"Note : oui?"')
})

test('accepts any string, markup included, for creative spacing', () => {
  const typo = createTypo({ locales: { fr: { spaceBefore: { '!': '<span class="bang"> </span>' } } } })
  assert.equal(typo.html('<p>Oui !</p>', 'fr'), '<p>Oui<span class="bang"> </span>!</p>')
})

test('a region tag extends its language', () => {
  const typo = createTypo({ locales: { 'fr-CH': { spaceBefore: { ':': NNBSP } } } })
  assert.equal(typo.text('Note : oui !', 'fr-CH'), nb('Note^: oui^!'))
  assert.equal(typo.text('Note : oui !', 'fr'), nb('Note~: oui^!'))
})

test('a region tag extends the customized language', () => {
  const typo = createTypo({ locales: { 'fr-ch': { spaceBefore: { ':': NNBSP } }, fr: { quotes: false } } })
  assert.equal(typo.text('"Note : oui"', 'fr-CH'), nb('"Note^: oui"'))
})

test('adds a language from scratch', () => {
  const typo = createTypo({
    locales: { de: { quotes: ['„', '“', '‚', '‘'], apostrophe: '’', ellipsis: '…' } },
  })
  assert.equal(typo.text('Er sagt "Hallo"...', 'de'), 'Er sagt „Hallo“…')
})

test('a language can start from a built-in one', () => {
  const typo = createTypo({ locales: { it: { ...fr, spaceBefore: {}, spaceInsideQuotes: false } } })
  assert.equal(typo.text('Dice "ciao"!', 'it'), 'Dice «ciao»!')
})

test('the default instance is not affected by custom ones', async () => {
  createTypo({ locales: { fr: { quotes: false } } })
  const { fixText } = await import('../src/index.ts')
  assert.equal(fixText('"Oui"', 'fr'), nb('«~Oui~»'))
})
