import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createTypo, fixHtml, fixParts, fixPortableText, fixText, rehypeTinyTypeRules } from '../src/index.ts'

const nb = (s) => s.replaceAll('~', '\u00A0').replaceAll('^', '\u202F')

test('entities never decode into markup', () => {
  for (const html of [
    '<p>1 <&#x69;mg src=x onerror=alert(1)> 2</p>',
    '<p><&#115;cript>alert(1)<&#47;script></p>',
    '<p>&amp&#59;lt; x</p>',
    '<p>&#60;b&#62; &lt;i&gt;</p>',
  ]) {
    const out = fixHtml(html, 'en')
    assert.doesNotMatch(out, /<(img|script|b|i)\b/i, html)
  }
})

test('unchanged text keeps its entities', () => {
  assert.equal(fixHtml('<p>caf&eacute; &copy; &#233;</p>', 'fr'), '<p>caf&eacute; &copy; &#233;</p>')
  assert.equal(fixHtml('<p>Tom &amp; Jerry</p>', 'en'), '<p>Tom &amp; Jerry</p>')
})

test('attributes with stray quotes stay one tag', () => {
  const html = '<a href=x"y title=a&#x20;onmouseover&#x3d;alert(1)>lien</a>'
  assert.equal(fixHtml(html, 'fr'), html)
  assert.equal(fixHtml("<img alt='it's'> It's", 'en'), "<img alt='it's'> It’s")
})

test('C1 numeric entities are not decoded into control characters', () => {
  assert.doesNotMatch(fixHtml('l&#146;ete &#150; oui !', 'fr'), /[\u0080-\u009F]/)
})

test('quotes typed with inner spaces', () => {
  assert.equal(fixText('Il dit " oui " !', 'fr'), nb('Il dit «~oui~»^!'))
  assert.equal(fixText('" Bonjour " et " Au revoir "', 'fr'), nb('«~Bonjour~» et «~Au revoir~»'))
  assert.equal(fixText('(" a ")', 'fr'), nb('(«~a~»)'))
  assert.equal(fixText('Il dit:"oui"', 'fr'), nb('Il dit~:«~oui~»'))
  assert.equal(fixText('He said " yes "', 'en'), 'He said “ yes ”')
})

test('quotes around code and language changes', () => {
  assert.equal(fixHtml('Utilisez "<code>npm</code>".', 'fr'), nb('Utilisez «~<code>npm</code>~».'))
  assert.equal(fixHtml('Il a dit "<span lang="en">Hello</span>".', 'fr'), nb('Il a dit «~<span lang="en">Hello</span>~».'))
  assert.equal(fixHtml('<p><code>c</code> !</p>', 'fr'), nb('<p><code>c</code>^!</p>'))
  const blocks = [
    {
      _type: 'block',
      children: [
        { _type: 'span', text: 'Utilisez "' },
        { _type: 'span', text: 'npm', marks: ['code'] },
        { _type: 'span', text: '".' },
      ],
    },
  ]
  assert.deepEqual(fixPortableText(blocks, 'fr')[0].children.map((c) => c.text), nb('Utilisez «~|npm|~».').split('|'))
})

test('removing a space never moves text across tags', () => {
  assert.equal(fixHtml('Wait <a href="/x">?</a>', 'en'), 'Wait<a href="/x">?</a>')
  assert.equal(fixHtml('Hello <em>!</em>', 'en'), 'Hello<em>!</em>')
  assert.deepEqual(fixParts(['Hello ', '!'], 'en'), ['Hello', '!'])
})

test('opaque content is seen as a word', () => {
  assert.equal(fixHtml('Hello &amp; !', 'en'), 'Hello &amp;!')
  assert.equal(fixHtml('Bonjour&mdash;"oui"', 'fr'), nb('Bonjour—«~oui~»'))
  const tree = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'p',
        properties: {},
        children: [
          { type: 'text', value: 'Hello ' },
          { type: 'mdxTextExpression', value: 'name' },
          { type: 'text', value: ', welcome' },
        ],
      },
    ],
  }
  rehypeTinyTypeRules({ locale: 'en' })(tree)
  assert.deepEqual(tree.children[0].children.map((c) => c.value), ['Hello ', 'name', ', welcome'])
})

test('scopes close on implied end tags', () => {
  assert.equal(fixHtml('<p lang="en">Yes !<p>Oui !</p>', 'fr'), nb('<p lang="en">Yes!<p>Oui^!</p>'))
  assert.equal(fixHtml('<ul><li lang="en">Yes !<li>Oui !</ul>', 'fr'), nb('<ul><li lang="en">Yes!<li>Oui^!</ul>'))
  assert.equal(fixHtml('<div lang="en"><div/>Yes !</div>Yes !</div>', 'fr'), '<div lang="en"><div/>Yes!</div>Yes!</div>')
})

test('attribute values are not read as attributes', () => {
  assert.equal(fixHtml('<p title="x lang=en y">Oui !</p>', 'fr'), nb('<p title="x lang=en y">Oui^!</p>'))
  assert.equal(fixHtml('<p data-x="a data-prevent-ttr b">Oui !</p>', 'fr'), nb('<p data-x="a data-prevent-ttr b">Oui^!</p>'))
  assert.equal(fixHtml('<p lang="en"data-x>Yes !</p>', 'fr'), '<p lang="en"data-x>Yes!</p>')
})

test('idempotent with widows and rule order', () => {
  const typo = createTypo({ locales: { fr: { widowSpace: '\u00A0' }, en: { widowSpace: '\u00A0' } } })
  for (const [text, locale] of [
    ['Une phrase qui finit ...', 'fr'],
    ['A sentence that ends ...', 'en'],
    ['Une liste qui finit par *', 'fr'],
    ['Il y avait...000 000', 'fr'],
  ]) {
    const once = typo.text(text, locale)
    assert.equal(typo.text(once, locale), once, text)
  }
  assert.equal(typo.text('Une phrase qui finit ...', 'fr'), nb('Une phrase qui~finit~…'))
})

test('a replacement may produce an empty string', () => {
  assert.equal(createTypo({ locales: { fr: { replacements: { '(x)': '' } } } }).text('(x)', 'fr'), '')
})

test('locale lookup truncates subtags', () => {
  const typo = createTypo({ locales: { 'fr-CA': { spaceBefore: { '!': '' } } } })
  assert.equal(typo.text('Oui !', 'fr-CA-u-nu-latn'), 'Oui!')
  assert.equal(typo.text('Oui !', ' fr '), nb('Oui^!'))
})

test('odd HTML is parsed like a browser does', () => {
  assert.equal(fixHtml('<!-->Oui !', 'fr'), nb('<!-->Oui^!'))
  assert.equal(fixHtml('Oui&nbsp!', 'fr'), nb('Oui^!'))
  assert.equal(fixHtml('<script>a = "x !"</script foo><p>Oui !</p>', 'fr'), nb('<script>a = "x !"</script foo><p>Oui^!</p>'))
  assert.equal(fixHtml('<title>Oui !</title>', 'fr'), nb('<title>Oui^!</title>'))
})

test('emoticons and verbs after numbers', () => {
  assert.equal(fixText('Super :)', 'en'), 'Super :)')
  assert.equal(fixText('Smile ;)', 'en'), 'Smile ;)')
  assert.equal(fixText("En 2023 s'est tenu", 'fr'), 'En 2023 s’est tenu')
})

test('malformed HTML stays linear', () => {
  for (const html of ['<a'.repeat(30000), "<a '".repeat(30000), '<!--'.repeat(30000), '<script>'.repeat(20000)]) {
    const start = performance.now()
    fixHtml(html, 'fr')
    assert.ok(performance.now() - start < 500, html.slice(0, 10))
  }
})

test('inline end tags never close a p or li scope', () => {
  const prevented = '<p data-prevent-ttr>Non <em>x</em> : "non" !</p>'
  assert.equal(fixHtml(prevented, 'fr'), prevented)
  assert.equal(
    fixHtml('<div lang="fr"><p lang="en"><a href="#">Hi</a> "there" : ok !</p></div>'),
    '<div lang="fr"><p lang="en"><a href="#">Hi</a> “there”: ok!</p></div>',
  )
  assert.equal(fixHtml('<div><p lang="en">Yes !</div> Oui !', 'fr'), nb('<div><p lang="en">Yes!</div> Oui^!'))
})

test('nested lists and other implied end tags', () => {
  const html = '<ul><li data-prevent-ttr>Item !<ul><li>Sous !</li><li>Deux !</ul> fin !</li><li>Oui !</li></ul>'
  assert.equal(fixHtml(html, 'fr'), nb('<ul><li data-prevent-ttr>Item !<ul><li>Sous !</li><li>Deux !</ul> fin !</li><li>Oui^!</li></ul>'))
  assert.equal(fixHtml('<dl><dt lang="en">Term !<dd>Déf !</dl>', 'fr'), nb('<dl><dt lang="en">Term!<dd>Déf^!</dl>'))
  assert.equal(fixHtml('<table><tr><td lang="en">A !<td>B !</table>', 'fr'), nb('<table><tr><td lang="en">A!<td>B^!</table>'))
})

test('letter entities are real letters to the rules', () => {
  assert.equal(fixHtml("<p>The caf&eacute;'s menu</p>", 'en'), '<p>The café’s menu</p>')
  const units = createTypo({ locales: { fr: { unitSpace: '\u00A0', abbreviationSpace: '\u00A0' } } })
  assert.equal(units.html('<p>50 &euro; et M. &Eacute;mile</p>', 'fr'), nb('<p>50~€ et M.~Émile</p>'))
  assert.equal(fixHtml('<p>a &lt; b !</p>', 'fr'), nb('<p>a &lt; b^!</p>'))
  assert.equal(fixHtml('<p>Tom &amp; Jerry !</p>', 'fr'), nb('<p>Tom &amp; Jerry^!</p>'))
})

test('template content is left alone, as DOM and hast do', () => {
  assert.equal(fixHtml('<template><p>Oui !</p></template>', 'fr'), '<template><p>Oui !</p></template>')
})

test('MDX elements named like code elements are skipped', () => {
  const jsx = (name, value, type = 'mdxJsxFlowElement') => ({ type, name, attributes: [], children: [{ type: 'text', value }] })
  const tree = {
    type: 'root',
    children: [
      jsx('pre', 'a : b !'),
      jsx('code', 'npm : "x"', 'mdxJsxTextElement'),
      jsx('svg', 'Oui !'),
      jsx('p', 'Oui !'),
      { type: 'mdxJsxFlowElement', name: 'Note', attributes: [{ type: 'mdxJsxAttribute', name: 'lang', value: { type: 'mdxJsxAttributeValueExpression', value: 'x' } }], children: [{ type: 'text', value: 'Oui !' }] },
    ],
  }
  rehypeTinyTypeRules({ locale: 'fr' })(tree)
  assert.deepEqual(tree.children.map((n) => n.children[0].value), ['a : b !', 'npm : "x"', 'Oui !', nb('Oui^!'), nb('Oui^!')])
})

test('inches after a number stay straight', () => {
  assert.equal(fixText('un écran 27" !', 'fr'), nb('un écran 27"^!'))
  assert.equal(fixText('He is 5\'11"', 'en'), 'He is 5’11"')
  assert.equal(fixText('"Le 27" est grand"', 'fr'), nb('«~Le 27~» est grand~»'))
})

test('fixParts tolerates missing input', () => {
  assert.equal(fixParts(null, 'fr'), null)
  assert.deepEqual(fixParts(['Oui', null, ' !'], 'fr'), ['Oui', null, nb('^!')])
})

test('an explicit undefined setting keeps the built-in one', () => {
  assert.equal(createTypo({ locales: { fr: { quotes: undefined } } }).text('"Oui"', 'fr'), nb('«~Oui~»'))
})

test('Portable Text keeps unchanged blocks and spans as they are', () => {
  const blocks = [{ _type: 'block', children: [{ _type: 'span', text: 'Rien' }] }, { _type: 'block', children: [{ _type: 'span', text: 'Oui ! ' }, { _type: 'span', text: 'Rien' }] }]
  const out = fixPortableText(blocks, 'fr')
  assert.equal(out[0], blocks[0])
  assert.notEqual(out[1], blocks[1])
  assert.equal(out[1].children[1], blocks[1].children[1])
})

test('no quadratic cliff on many scopes or long widow tails', () => {
  const typo = createTypo({ locales: { fr: { widowSpace: '\u00A0' } } })
  for (const run of [
    () => fixHtml('<span lang="fr"></span>'.repeat(8000), 'fr'),
    () => typo.text('a' + ' !'.repeat(8000), 'fr'),
    () => typo.text('x '.repeat(4) + 'a'.repeat(8000), 'fr'),
  ]) {
    const start = performance.now()
    run()
    assert.ok(performance.now() - start < 300)
  }
})

test('thousands stay linear on huge numbers', () => {
  const start = performance.now()
  createTypo({ locales: { fr: { thousandsSeparator: '\u202F' } } }).text('1' + ' 000'.repeat(20000), 'fr')
  assert.ok(performance.now() - start < 100)
})
