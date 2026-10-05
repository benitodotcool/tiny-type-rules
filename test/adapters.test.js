import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createTypo, fixElement, fixPortableText, rehypeTinyTypeRules } from '../src/index.ts'

const nb = (s) => s.replaceAll('~', '\u00A0').replaceAll('^', '\u202F')

test('Portable Text: spans fixed as one run, code spans and other blocks untouched', () => {
  const blocks = [
    {
      _type: 'block',
      children: [
        { _type: 'span', _key: 'a', text: 'Il a dit ', marks: [] },
        { _type: 'span', _key: 'b', text: '"oui"', marks: ['em'] },
        { _type: 'span', _key: 'c', text: ' ! ', marks: [] },
        { _type: 'span', _key: 'd', text: 'a !b', marks: ['code'] },
        { _type: 'span', _key: 'e', text: ' ok ?', marks: [] },
      ],
    },
    { _type: 'image', alt: 'Oui !' },
    { _type: 'code', code: 'a : b' },
  ]
  const input = structuredClone(blocks)
  const out = fixPortableText(blocks, 'fr')
  assert.deepEqual(blocks, input)
  assert.deepEqual(
    out[0].children.map((c) => c.text),
    ['Il a dit ', '«~oui~»', '^! ', 'a !b', ' ok^?'].map(nb),
  )
  assert.equal(out[0].children[1]._key, 'b')
  assert.equal(out[1], blocks[1])
  assert.equal(out[2], blocks[2])
  assert.deepEqual(fixPortableText(blocks, 'de'), blocks)
})

const h = (tagName, properties, ...children) => ({ type: 'element', tagName, properties, children })
const t = (value) => ({ type: 'text', value })

test('rehype plugin', () => {
  const tree = {
    type: 'root',
    children: [
      h('p', {}, t('Bonjour '), h('em', {}, t('à tous')), t(' !')),
      h('p', { dataTtrPrevent: true }, t('Non !')),
      h('p', { lang: 'en' }, t("It's me !")),
      h('pre', {}, h('code', {}, t('a : b'))),
      { type: 'comment', value: 'x' },
      { type: 'mdxJsxFlowElement', name: 'Note', attributes: [{ type: 'mdxJsxAttribute', name: 'data-ttr-prevent', value: null }], children: [t('Non !')] },
    ],
  }
  rehypeTinyTypeRules({ locale: 'fr' })(tree)
  const texts = []
  const collect = (n) => (n.type === 'text' ? texts.push(n.value) : n.children?.forEach(collect))
  collect(tree)
  assert.deepEqual(texts, ['Bonjour ', 'à tous', '^!', 'Non !', 'It’s me!', 'a : b', 'Non !'].map(nb))
})

test('rehype plugin with custom settings', () => {
  const tree = { type: 'root', children: [h('p', {}, t('Oui !'))] }
  rehypeTinyTypeRules({ locale: 'fr', typo: createTypo({ locales: { fr: { spaceBefore: { '!': '' } } } }) })(tree)
  assert.equal(tree.children[0].children[0].value, 'Oui!')
})

// Just enough of the DOM for fixElement.
function el(localName, attrs, ...children) {
  const node = { nodeType: 1, nodeValue: null, localName, parentElement: null, childNodes: children }
  node.getAttribute = (name) => (name in attrs ? attrs[name] : null)
  for (const child of children) child.parentElement = node
  return node
}
const tx = (nodeValue) => ({ nodeType: 3, nodeValue, parentElement: null, childNodes: [] })
const comment = () => ({ nodeType: 8, nodeValue: '', parentElement: null, childNodes: [] })

test('fixElement works in place and respects ancestors', () => {
  const a = tx('Bonjour')
  const b = tx(' !')
  const code = tx('a : b')
  const prevented = tx('Non !')
  const english = tx("It's !")
  const article = el('article', {}, el('p', {}, a, comment(), el('strong', {}, b)), el('code', {}, code), el('p', { 'data-ttr-prevent': '' }, prevented), el('p', { lang: 'en' }, english))
  const html = el('html', { lang: 'fr' }, el('body', {}, article))
  fixElement(article)
  assert.deepEqual([a, b, code, prevented, english].map((n) => n.nodeValue), ['Bonjour', '^!', 'a : b', 'Non !', 'It’s!'].map(nb))
  assert.ok(html)

  const inside = tx('Oui !')
  el('div', { 'data-ttr-prevent': '' }, el('p', {}, inside))
  fixElement(inside.parentElement, 'fr')
  assert.equal(inside.nodeValue, 'Oui !')

  const lone = tx('Oui !')
  el('p', { lang: 'fr' }, lone)
  fixElement(lone)
  assert.equal(lone.nodeValue, nb('Oui^!'))
})

test('rehype subpath exports the plugin as default', async () => {
  const { default: plugin } = await import('../src/rehype.ts')
  assert.equal(plugin, rehypeTinyTypeRules)
})

test('rehype plugin takes serializable settings', () => {
  const tree = { type: 'root', children: [h('p', {}, t('Oui !'))] }
  rehypeTinyTypeRules({ locale: 'fr', locales: { fr: { spaceBefore: { '!': '' } } } })(tree)
  assert.equal(tree.children[0].children[0].value, 'Oui!')
})

test('a default locale applies when a call gives none', () => {
  const typo = createTypo({ locale: 'fr' })
  assert.equal(typo.text('Oui !'), nb('Oui^!'))
  assert.equal(typo.text('Yes !', 'en'), 'Yes!')
  assert.equal(typo.html('<p>Oui !</p>'), nb('<p>Oui^!</p>'))
  assert.equal(typo.html('<p lang="en">Yes !</p>'), '<p lang="en">Yes!</p>')
})

test('watch fixes the DOM, then every change, and stops', async () => {
  const { Window } = await import('happy-dom')
  const window = new Window()
  globalThis.MutationObserver = window.MutationObserver
  const { document } = window
  document.body.innerHTML = '<main lang="fr"><p>Bonjour <em>à tous</em> !</p></main>'
  const main = document.querySelector('main')
  const stop = createTypo().watch(main)
  const show = () => main.innerHTML.replaceAll(' ', '~').replaceAll(' ', '^')
  assert.equal(show(), '<p>Bonjour <em>à tous</em>^!</p>')

  main.querySelector('em').textContent = 'vous'
  main.insertAdjacentHTML('beforeend', '<p>Vraiment ?</p>')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(show(), '<p>Bonjour <em>vous</em>^!</p><p>Vraiment^?</p>')

  stop()
  main.insertAdjacentHTML('beforeend', '<p>Fini ?</p>')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.ok(show().endsWith('<p>Fini ?</p>'))
  delete globalThis.MutationObserver
  await window.happyDOM.close()
})
