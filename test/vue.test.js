import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

import { createTypo } from '../src/index.ts'
import { Typo, TypoPlugin, useTypo } from '../src/vue/index.ts'

const nb = (s) => s.replaceAll('~', ' ').replaceAll('^', ' ')
const show = (s) => s.replaceAll(' ', '~').replaceAll(' ', '^').replace(/<!--\[-->|<!--\]-->/g, '')

const MyLink = { template: '<a href="#"><slot /></a>' }

async function render(template, plugin) {
  const app = createSSRApp({ components: { Typo, MyLink }, template })
  if (plugin) app.use(TypoPlugin, plugin)
  return show(await renderToString(app))
}

test('Typo fixes its slot across inline elements', async () => {
  assert.equal(await render('<p><Typo locale="fr">Il a dit : "<em>oui</em>" !</Typo></p>'), '<p>Il a dit~: «~<em>oui</em>~»^!</p>')
  assert.equal(await render(`<h1><Typo locale="en">It's {{ 'fine' }}...</Typo></h1>`), '<h1>It’s fine…</h1>')
})

test('Typo leaves code, other languages and opted-out elements alone', async () => {
  assert.equal(await render('<Typo locale="fr">Lancez <code>a : "b"</code> !</Typo>'), 'Lancez <code>a : &quot;b&quot;</code>^!')
  assert.equal(await render('<Typo locale="fr"><span lang="en">Yes !</span> Oui !</Typo>'), '<span lang="en">Yes !</span> Oui^!')
  assert.equal(await render('<Typo locale="fr"><b data-ttr-prevent>Non !</b></Typo>'), '<b data-ttr-prevent>Non !</b>')
})

test('Typo fixes the slots of child components', async () => {
  assert.equal(await render('<Typo locale="fr"><MyLink>Oui !</MyLink> ok ?</Typo>'), '<a href="#">Oui^!</a> ok^?')
})

test('Typo renders fixed HTML', async () => {
  assert.equal(await render(`<Typo locale="fr" as="section" class="x" html="<p>Oui !</p>" />`), '<section class="x"><p>Oui^!</p></section>')
})

test('TypoPlugin sets the default locale and settings for Typo and useTypo', async () => {
  const plugin = { locale: 'fr', locales: { fr: { spaceBefore: { '?': '' } } } }
  assert.equal(await render('<Typo>Oui ! Non ?</Typo>', plugin), 'Oui^! Non?')
  const Title = { setup: () => () => h('h1', useTypo().text('Oui !')) }
  const app = createSSRApp(Title).use(TypoPlugin, { locale: 'fr' })
  assert.equal(show(await renderToString(app)), '<h1>Oui^!</h1>')
  assert.equal(show(await renderToString(createSSRApp(Title))), '<h1>Oui !</h1>')
})

test('Typo accepts a custom fixer', async () => {
  const app = createSSRApp({ components: { Typo }, setup: () => ({ typo: createTypo({ locale: 'en' }) }), template: '<Typo :typo="typo">Hi !</Typo>' })
  assert.equal(show(await renderToString(app)), 'Hi!')
})

test('hydration matches the server HTML', async () => {
  const { Window } = await import('happy-dom')
  const window = new Window()
  const keys = ['window', 'document', 'Node', 'Element', 'SVGElement', 'HTMLElement', 'navigator']
  const saved = Object.fromEntries(keys.map((k) => [k, globalThis[k]]))
  for (const k of keys) Object.defineProperty(globalThis, k, { value: k === 'window' ? window : window[k], configurable: true, writable: true })
  const warnings = []
  const warn = console.warn
  console.warn = (...args) => warnings.push(args.join(' '))
  try {
    const template = '<p><Typo locale="fr">Il a dit : "<em>{{ word }}</em>" !</Typo> <MyLink>Oui !</MyLink></p>'
    const component = { components: { Typo, MyLink }, data: () => ({ word: 'oui' }), template }
    const html = await renderToString(createSSRApp(component))
    window.document.body.innerHTML = `<div id="app">${html}</div>`
    const vm = createSSRApp(component).mount(window.document.querySelector('#app'))
    assert.deepEqual(warnings.filter((w) => /mismatch/i.test(w)), [])
    vm.word = 'non'
    await new Promise((resolve) => setTimeout(resolve, 0))
    const out = show(window.document.querySelector('#app').innerHTML.replaceAll('&nbsp;', '~'))
    assert.equal(out, '<p>Il a dit~: «~<em>non</em>~»^! <a href="#">Oui !</a></p>')
  } finally {
    console.warn = warn
    for (const k of keys) Object.defineProperty(globalThis, k, { value: saved[k], configurable: true, writable: true })
    await window.happyDOM.close()
  }
})
