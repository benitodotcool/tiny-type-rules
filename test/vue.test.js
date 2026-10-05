import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createSSRApp, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'

import { TTRPlugin, ttrTransform, useTTR } from '../src/vue/index.ts'

const show = (s) =>
  s.replaceAll(' ', '~').replaceAll(' ', '^').replaceAll('&nbsp;', '~').replace(/<!--\[-->|<!--\]-->|<!---->/g, '')

const Card = { template: '<p class="card">Carte : oui !</p>' }
const Wrap = { template: '<div class="wrap"><slot /></div>' }
const Rich = { props: ['value'], setup: (props) => () => h('p', props.value[0].children[0].text) }
const Link = { setup: (_, { slots }) => () => h('a', { href: '/' }, slots.default?.()) }

function app(component, options = { locale: 'fr' }) {
  const instance = createSSRApp({ components: { Card, Wrap, Rich, Link }, ...component })
  instance.config.compilerOptions.nodeTransforms = [ttrTransform]
  return instance.use(TTRPlugin, options)
}
const render = async (template, data = {}, options) => show(await renderToString(app({ template, data: () => data }, options)))

test('template text and interpolations are fixed while rendering', async () => {
  assert.equal(await render('<h1>{{ title }}</h1>', { title: 'Il a dit : "Bonjour !"' }), '<h1>Il a dit~: «~Bonjour^!~»</h1>')
  assert.equal(await render('<p>Bonjour {{ name }} !</p>', { name: 'Ana' }), '<p>Bonjour Ana^!</p>')
  assert.equal(await render('<p>Le <em>titre</em> : <code>npm i</code> !</p>'), '<p>Le <em>titre</em>~: <code>npm i</code>^!</p>')
  assert.equal(await render('<p>{{ 3 }} kg et {{ obj }} !</p>', { obj: { a: 1 } }), '<p>3 kg et {\n  &quot;a&quot;: 1\n}^!</p>')
})

test('child components, slots, v-html and Portable Text', async () => {
  assert.equal(await render('<Card />'), '<p class="card">Carte~: oui^!</p>')
  assert.equal(await render('<Wrap>Slot : oui !</Wrap>'), '<div class="wrap">Slot~: oui^!</div>')
  assert.equal(await render('<p><Link>Accueil !</Link> ou pas ?</p>'), '<p><a href="/">Accueil^!</a> ou pas^?</p>')
  assert.equal(await render('<div v-html="html" />', { html: '<p>Oui : non ?</p>' }), '<div><p>Oui~: non^?</p></div>')
  const body = [{ _type: 'block', children: [{ _type: 'span', text: 'Portable : oui !' }] }]
  assert.equal(await render('<Rich :value="body" />', { body }), '<p>Portable~: oui^!</p>')
  assert.equal(body[0].children[0].text, 'Portable : oui !')
})

test('lang, data-ttr-prevent, data-ttr and code scope the text, across components', async () => {
  assert.equal(await render(`<p lang="en">"Hi" , it's me !</p>`), '<p lang="en">“Hi”, it’s me!</p>')
  assert.equal(await render('<div data-ttr-prevent><p>Non !</p><Card /></div>'), '<div data-ttr-prevent><p>Non !</p><p class="card" data-ttr-prevent>Carte : oui !</p></div>')
  assert.equal(await render('<div data-ttr-prevent><p data-ttr>Oui !</p></div>'), '<div data-ttr-prevent><p data-ttr>Oui^!</p></div>')
  assert.equal(await render('<div lang="en"><Card /></div>'), '<div lang="en"><p class="card" data-ttr-lang="en">Carte: oui!</p></div>')
  assert.equal(await render('<pre>a : b !</pre><Card data-ttr-prevent />'), '<pre>a : b !</pre><p class="card" data-ttr-prevent>Carte : oui !</p>')
})

test('settings, the current language and useTTR', async () => {
  const locale = ref('en')
  assert.equal(await render('<p>Oui ! Non ?</p>', {}, { locale: 'fr', locales: { fr: { spaceBefore: { '?': '' } } } }), '<p>Oui^! Non?</p>')
  assert.equal(await render('<p>Yes !</p>', {}, { getLocale: () => locale.value }), '<p>Yes!</p>')
  assert.equal(await render('<p>Oui !</p>', {}, {}), '<p>Oui !</p>')
  const Title = { setup: () => () => h('h1', useTTR().text('Oui !')) }
  const instance = createSSRApp(Title).use(TTRPlugin, { locale: 'fr' })
  assert.equal(show(await renderToString(instance)), '<h1>Oui^!</h1>')
})

test('hydration matches the server HTML, and updates stay fixed', async () => {
  const { Window } = await import('happy-dom')
  const window = new Window()
  const keys = ['window', 'document', 'Node', 'Element', 'SVGElement', 'HTMLElement', 'navigator']
  const saved = Object.fromEntries(keys.map((k) => [k, globalThis[k]]))
  for (const k of keys) Object.defineProperty(globalThis, k, { value: k === 'window' ? window : window[k], configurable: true, writable: true })
  const warnings = []
  const warn = console.warn
  console.warn = (...args) => warnings.push(args.join(' '))
  try {
    const component = { template: '<div>Il a dit : "<em>{{ word }}</em>" ! <Card /><Link>Accueil {{ word }} !</Link></div>', data: () => ({ word: 'oui' }) }
    const html = await renderToString(app(component))
    window.document.body.innerHTML = `<div id="app">${html}</div>`
    const vm = app(component).mount(window.document.querySelector('#app'))
    assert.deepEqual(warnings.filter((w) => /mismatch/i.test(w)), [])
    vm.word = 'non'
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(show(window.document.querySelector('#app').innerHTML), '<div>Il a dit~: «~<em>non</em>~»^! <p class="card">Carte~: oui^!</p><a href="/">Accueil non^!</a></div>')
  } finally {
    console.warn = warn
    for (const k of keys) Object.defineProperty(globalThis, k, { value: saved[k], configurable: true, writable: true })
    await window.happyDOM.close()
  }
})
