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

test('opt-in settings: dash and replacements', () => {
  const typo = createTypo({ locales: { fr: { dash: '–', replacements: { '(c)': '©', '->': '→' } } } })
  assert.equal(typo.text('Il est - je crois - parti', 'fr'), 'Il est – je crois – parti')
  assert.equal(typo.text('a -- b', 'fr'), 'a – b')
  assert.equal(typo.text('pré-requis, -5, a-b', 'fr'), 'pré-requis, -5, a-b')
  assert.equal(typo.text('(c) Brun Network -> ici', 'fr'), '© Brun Network → ici')
})

test('opt-in settings: widows', () => {
  const typo = createTypo({ locales: { fr: { widowSpace: '\u00A0' } } })
  assert.equal(typo.text('Un texte qui finit bien', 'fr'), nb('Un texte qui finit~bien'))
  assert.equal(typo.text('Il finit par un cri !', 'fr'), nb('Il finit par un~cri^!'))
  assert.equal(typo.text('Mot', 'fr'), 'Mot')
  assert.equal(typo.text('Deux mots\n', 'fr'), nb('Deux~mots\n'))
  assert.equal(typo.html('<p>Un deux trois</p><p>quatre <em>cinq</em></p>', 'fr'), nb('<p>Un deux~trois</p><p>quatre~<em>cinq</em></p>'))
  const once = typo.text('Il finit par un cri !', 'fr')
  assert.equal(typo.text(once, 'fr'), once)
})

test('arrays replace, maps merge', () => {
  const typo = createTypo({ locales: { fr: { units: ['pc'], replacements: { '(r)': '®' } } } })
  assert.equal(typo.text('5 pc, 5 kg', 'fr'), nb('5~pc, 5 kg'))
})

test('non-breaking spaces of every width survive widows and a second pass', () => {
  const typo = createTypo({ locales: { fr: { spaceBefore: { '!': ' ' }, widowSpace: ' ' } } })
  const once = typo.text('Il finit par un cri !', 'fr')
  assert.equal(once, nb('Il finit par un~cri !'))
  assert.equal(typo.text(once, 'fr'), once)
})
