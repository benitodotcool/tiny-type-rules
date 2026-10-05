import assert from 'node:assert/strict'
import { test } from 'node:test'

import { fixParts, fixText } from '../src/index.ts'

// `~` stands for U+00A0 (no-break space), `^` for U+202F (narrow no-break space).
const nb = (s) => s.replaceAll('~', ' ').replaceAll('^', ' ')

const cases = {
  fr: [
    ['Bonjour !', 'Bonjour^!'],
    ['Bonjour!', 'Bonjour^!'],
    ['Quoi ?!', 'Quoi^?!'],
    ['Vraiment ; oui', 'Vraiment^; oui'],
    ['Note : ceci', 'Note~: ceci'],
    ['Note:', 'Note~:'],
    ['Bonjour !', 'Bonjour^!'],
    ['Bonjour   ?', 'Bonjour^?'],
    ['« Bonjour »', '«~Bonjour~»'],
    ['«Bonjour»', '«~Bonjour~»'],
    ['Il a dit : "Bonjour !"', 'Il a dit~: «~Bonjour^!~»'],
    ['« Il a dit "oui" »', '«~Il a dit “oui”~»'],
    ['"Non"!', '«~Non~»^!'],
    ["L'apostrophe d'aujourd'hui", 'L’apostrophe d’aujourd’hui'],
    ['Et puis...', 'Et puis…'],
    ['Quoi...?', 'Quoi…^?'],
    ['3 000 personnes', '3^000 personnes'],
    ['1 000 000 €', '1^000^000~€'],
    ['en 2023 300 personnes', 'en 2023 300 personnes'],
    ['50 %', '50~%'],
    ['10 kg et 5 min', '10~kg et 5~min'],
    ['20 °C', '20~°C'],
    ['5 maisons', '5 maisons'],
    ['Oui , non', 'Oui, non'],
    ['M. Dupont et Mme Durand', 'M.~Dupont et Mme~Durand'],
    ['le n° 5', 'le n°~5'],
    ['Dommage. Me voilà', 'Dommage. Me~voilà'],
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
    ['50 %', '50~%'],
    ['Four.... dots', 'Four.... dots'],
    ['Mr. Smith, see p. 12', 'Mr.~Smith, see p.~12'],
    ['group. Then', 'group. Then'],
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
