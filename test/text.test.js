import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createTypo, fixParts, fixText, NBSP, NNBSP } from '../src/index.ts'

// `~` stands for U+00A0 (no-break space), `^` for U+202F (narrow no-break space).
const nb = (s) => s.replaceAll('~', '\u00A0').replaceAll('^', '\u202F')

const cases = {
  fr: [
    ['Bonjour !', 'Bonjour^!'],
    ['Bonjour!', 'Bonjour^!'],
    ['Quoi ?!', 'Quoi^?!'],
    ['Vraiment ; oui', 'Vraiment^; oui'],
    ['Note : ceci', 'Note~: ceci'],
    ['Note:', 'Note~:'],
    ['Bonjour\u00A0!', 'Bonjour^!'],
    ['Bonjour   ?', 'Bonjour^?'],
    ['« Bonjour »', '«~Bonjour~»'],
    ['«Bonjour»', '«~Bonjour~»'],
    ['Il a dit : "Bonjour !"', 'Il a dit~: «~Bonjour^!~»'],
    ['« Il a dit "oui" »', '«~Il a dit “oui”~»'],
    ['"Non"!', '«~Non~»^!'],
    ["L'apostrophe d'aujourd'hui", 'L’apostrophe d’aujourd’hui'],
    ['Et puis...', 'Et puis…'],
    ['Quoi...?', 'Quoi…^?'],
    ['3 000 kg, M. Dupont', '3 000 kg, M. Dupont'],
    ['Oui , non', 'Oui, non'],
    ['un tiret - ici', 'un tiret - ici'],
  ],
  en: [
    ['"Hello," she said.', '“Hello,” she said.'],
    ["It's 'quoted'.", 'It’s ‘quoted’.'],
    ["the dogs' bowls", 'the dogs’ bowls'],
    ["back in the '90s", 'back in the ’90s'],
    ['("quoted")', '(“quoted”)'],
    ['Hello !', 'Hello!'],
    ['Wait ; what ?', 'Wait; what?'],
    ['Note : this', 'Note: this'],
    ['Well...', 'Well…'],
    ['50 %, Mr. Smith', '50 %, Mr. Smith'],
    ['Four.... dots', 'Four.... dots'],
  ],
}

for (const [locale, list] of Object.entries(cases)) {
  test(`${locale}: rules`, () => {
    for (const [input, expected] of list) assert.equal(fixText(input, locale), nb(expected), input)
  })

  test(`${locale}: idempotent`, () => {
    for (const [input] of list) {
      const once = fixText(input, locale)
      assert.equal(fixText(once, locale), once, input)
    }
  })
}

test('leaves machine text alone', () => {
  for (const input of ['https://example.com/?q=1&a=b', 'à 12:30', 'mail@example.com', 'a:b;c!d?e', 'x!important']) {
    assert.equal(fixText(input, 'fr'), input)
    assert.equal(fixText(input, 'en'), input)
  }
})

test('never touches line breaks', () => {
  assert.equal(fixText('Bonjour\n!', 'fr'), 'Bonjour\n!')
  assert.equal(fixText('«\nBonjour', 'fr'), '«\nBonjour')
})

test('locale tags match on their language subtag', () => {
  assert.equal(fixText('Oui !', 'fr-CA'), nb('Oui^!'))
  assert.equal(fixText('Oui !', 'FR_fr'), nb('Oui^!'))
  assert.equal(fixText("it's", 'en-GB'), 'it’s')
})

test('unsupported locales leave the text unchanged', () => {
  assert.equal(fixText('Hallo "Welt" !', 'de'), 'Hallo "Welt" !')
  assert.equal(fixText('Hallo !', 'constructor'), 'Hallo !')
  assert.equal(fixText('Hallo !', ''), 'Hallo !')
})

test('fixParts applies rules across parts and keeps their count', () => {
  assert.deepEqual(fixParts(['Bonjour', ' !'], 'fr'), nb('Bonjour|^!').split('|'))
  assert.deepEqual(fixParts(['Bonjour ', '!'], 'fr'), nb('Bonjour^|!').split('|'))
  assert.deepEqual(fixParts(['"', 'Bonjour', '"'], 'fr'), nb('«~|Bonjour|~»').split('|'))
  assert.deepEqual(fixParts(['a', '', 'b'], 'fr'), ['a', '', 'b'])
  assert.deepEqual(fixParts([], 'fr'), [])
  assert.deepEqual(fixParts(['Hallo', ' !'], 'de'), ['Hallo', ' !'])
})

test('opt-in number, unit and abbreviation spaces', () => {
  const typo = createTypo({
    locales: {
      fr: { thousandsSeparator: NNBSP, unitSpace: NBSP, abbreviationSpace: NBSP },
      en: { unitSpace: NBSP, abbreviationSpace: NBSP },
    },
  })
  const cases = {
    fr: [
      ['3 000 personnes', '3^000 personnes'],
      ['1 000 000 €', '1^000^000~€'],
      ['en 2023 300 personnes', 'en 2023 300 personnes'],
      ['50 %', '50~%'],
      ['10 kg et 5 min', '10~kg et 5~min'],
      ['20 °C', '20~°C'],
      ['5 maisons', '5 maisons'],
      ["En 2023 s'est tenu", 'En 2023 s’est tenu'],
      ['M. Dupont et Mme Durand', 'M.~Dupont et Mme~Durand'],
      ['le n° 5', 'le n°~5'],
    ],
    en: [
      ['50 %', '50~%'],
      ['Mr. Smith, see p. 12', 'Mr.~Smith, see p.~12'],
      ['group. Then', 'group. Then'],
    ],
  }
  for (const [locale, list] of Object.entries(cases)) {
    for (const [input, expected] of list) {
      const once = typo.text(input, locale)
      assert.equal(once, nb(expected), input)
      assert.equal(typo.text(once, locale), once, input)
    }
  }
})
