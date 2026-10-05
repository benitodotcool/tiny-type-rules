import assert from 'node:assert/strict'
import { test } from 'node:test'

import { fixHtml } from '../src/index.ts'

const nb = (s) => s.replaceAll('~', ' ').replaceAll('^', ' ')
const fr = (html) => fixHtml(html, 'fr')

test('fixes text, never markup', () => {
  assert.equal(fr('<p class="a:b" title="Oui !">Oui !</p>'), nb('<p class="a:b" title="Oui !">Oui^!</p>'))
  assert.equal(fr('<img alt="Oui !"> !'), '<img alt="Oui !"> !')
})

test('rules see through inline tags and comments', () => {
  assert.equal(fr('<em>Bonjour</em>!'), nb('<em>Bonjour</em>^!'))
  assert.equal(fr('Bonjour <em>!</em>'), nb('Bonjour^<em>!</em>'))
  assert.equal(fr('"<a href="/">lien</a>"'), nb('«~<a href="/">lien</a>~»'))
  assert.equal(fr('Oui<!--[--> !<!--]-->'), nb('Oui<!--[-->^!<!--]-->'))
})

test('block tags end a run', () => {
  assert.equal(fr('<p>Bonjour</p><p>!</p>'), '<p>Bonjour</p><p>!</p>')
  assert.equal(fr('Bonjour<br>!'), 'Bonjour<br>!')
})

test('code-like elements are left untouched', () => {
  const html = '<pre><code class="x">a : "b" !</code></pre><kbd>Ctrl ?</kbd><script>if (a !b) {}</script><style>a:hover{}</style>'
  assert.equal(fr(html), html)
  assert.equal(fr('<code>a <span>!</span></code> b !'), nb('<code>a <span>!</span></code> b^!'))
  assert.equal(fr('<svg><text>Oui !</text></svg>'), '<svg><text>Oui !</text></svg>')
})

test('data-prevent-ttr opts a subtree out, data-ttr opts back in', () => {
  assert.equal(fr('<p data-prevent-ttr>Oui ! <b>Non !</b></p>'), '<p data-prevent-ttr>Oui ! <b>Non !</b></p>')
  assert.equal(
    fr('<div data-prevent-ttr>Oui ! <p data-ttr>Non !</p> Oui !</div>'),
    nb('<div data-prevent-ttr>Oui ! <p data-ttr>Non^!</p> Oui !</div>'),
  )
  assert.equal(fr('<pre data-ttr>Oui !</pre>'), nb('<pre data-ttr>Oui^!</pre>'))
})

test('lang and data-ttr-lang pick the rules', () => {
  assert.equal(fixHtml('<html lang="fr"><p>Oui !</p></html>'), nb('<html lang="fr"><p>Oui^!</p></html>'))
  assert.equal(fr('<p>Oui ! <span lang="en">Yes !</span> Oui !</p>'), nb('<p>Oui^! <span lang="en">Yes!</span> Oui^!</p>'))
  assert.equal(fr('<p lang="de">Ja !</p>'), '<p lang="de">Ja !</p>')
  assert.equal(fr('<p lang="de" data-ttr-lang="en">Ja !</p>'), '<p lang="de" data-ttr-lang="en">Ja!</p>')
  assert.equal(fr('<p lang="">Oui !</p>'), '<p lang="">Oui !</p>')
  assert.equal(fixHtml('<p>Oui !</p>'), '<p>Oui !</p>')
})

test('nested elements of the same name close the right scope', () => {
  assert.equal(
    fr('<div lang="en"><div>Yes !</div> Yes !</div> Oui !'),
    nb('<div lang="en"><div>Yes!</div> Yes!</div> Oui^!'),
  )
})

test('entities', () => {
  assert.equal(fr('Oui&nbsp;!'), nb('Oui^!'))
  assert.equal(fr('&quot;Oui&quot;'), nb('«~Oui~»'))
  assert.equal(fr('Tom &amp; Jerry ; a &lt; b !'), nb('Tom &amp; Jerry^; a &lt; b^!'))
  assert.equal(fr('&#60;b&#62; !'), nb('&#60;b&#62;^!'))
  assert.equal(fixHtml('<p lang="de">a&nbsp;!</p>', 'fr'), '<p lang="de">a&nbsp;!</p>')
})

test('handles odd markup without throwing', () => {
  for (const html of ['', '<', 'a < b !', '<p', '<!doctype html><p>Oui !', '<a title="x > y">Oui !</a>', '<code>Oui !']) {
    assert.equal(typeof fr(html), 'string')
  }
  assert.equal(fr('<a title="x > y">Oui !</a>'), nb('<a title="x > y">Oui^!</a>'))
  assert.equal(fr('<code>Oui !'), '<code>Oui !')
})

test('idempotent', () => {
  const html = '<p>"<em>Bonjour</em>" : oui !</p><p lang="en">"Hi", it\'s me !</p>'
  assert.equal(fr(fr(html)), fr(html))
})
