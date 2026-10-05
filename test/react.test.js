import assert from 'node:assert/strict'
import { test } from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { TTRProvider, useTTR } from '../src/react/index.ts'
import { jsxDEV } from '../src/react/jsx-dev-runtime.ts'
import { Fragment, jsx, jsxs } from '../src/react/jsx-runtime.ts'

const show = (s) => s.replaceAll(' ', '~').replaceAll(' ', '^').replaceAll('&nbsp;', '~')
const render = (page, props = { locale: 'fr' }) => show(renderToStaticMarkup(jsx(TTRProvider, { ...props, children: jsx(page, {}) })))

test('text written in JSX is fixed while rendering', () => {
  const title = 'Il a dit : "Bonjour !"'
  const Page = () =>
    jsxs('main', {
      children: [
        jsx('h1', { children: title }),
        jsxs('p', { children: ['Le ', jsx('em', { children: 'titre' }), ' : vraiment ?'] }),
        jsxs('p', { children: ['Bonjour ', 'Ana', ' !'] }),
        jsx(Fragment, { children: "C'est fini..." }),
      ],
    })
  assert.equal(
    render(Page),
    '<main><h1>Il a dit~: «~Bonjour^!~»</h1><p>Le <em>titre</em>~: vraiment^?</p><p>Bonjour Ana^!</p>C’est fini…</main>',
  )
})

test('nothing is fixed without a language', () => {
  const Page = () => jsx('p', { children: 'Oui !' })
  assert.equal(render(Page, {}), '<p>Oui !</p>')
  assert.equal(show(renderToStaticMarkup(jsx(Page, {}))), '<p>Oui !</p>')
})

test('lang, data-ttr-prevent, data-ttr and code scope their descendants', () => {
  const Page = () =>
    jsxs('div', {
      children: [
        jsx('p', { lang: 'en', children: jsxs('span', { children: ['Yes ', jsx('b', { children: 'sir' }), ' !'] }) }),
        jsx('section', {
          'data-ttr-prevent': true,
          children: jsxs('p', { children: ['Non ! ', jsx('span', { 'data-ttr': '', children: 'Oui !' })] }),
        }),
        jsxs('p', { children: ['Lancez ', jsx('code', { children: 'a : b' }), ' !'] }),
        jsx('p', { 'data-ttr-lang': 'en', children: "It's" }),
      ],
    })
  assert.equal(
    render(Page),
    '<div><p lang="en"><span>Yes <b>sir</b>!</span></p><section data-ttr-prevent="true"><p>Non ! <span data-ttr="">Oui^!</span></p></section><p>Lancez <code>a : b</code>^!</p><p data-ttr-lang="en">It’s</p></div>',
  )
})

test('HTML and Portable Text props are fixed', () => {
  const body = [{ _type: 'block', children: [{ _type: 'span', text: 'Oui !' }] }]
  const Rich = ({ value }) => jsx('p', { children: value[0].children[0].text })
  const Page = () =>
    jsxs('div', {
      children: [jsx('div', { dangerouslySetInnerHTML: { __html: '<p>Oui : non ?</p>' } }), jsx(Rich, { value: body })],
    })
  assert.equal(render(Page), '<div><div><p>Oui~: non^?</p></div><p>Oui^!</p></div>')
  assert.equal(body[0].children[0].text, 'Oui !')
})

test('component children and render props are fixed where they render', () => {
  const Link = ({ children }) => jsx('a', { href: '/', children })
  const Render = ({ children }) => jsx('p', { children: children('Oui !') })
  const Page = () => jsxs('div', { children: [jsx(Link, { children: 'Accueil !' }), jsx(Render, { children: (s) => s })] })
  assert.equal(render(Page), '<div><a href="/">Accueil^!</a><p>Oui^!</p></div>')
})

test('the dev runtime behaves the same', () => {
  const Page = () => jsxDEV('p', { children: 'Oui !' }, undefined, false, undefined, undefined)
  assert.equal(render(Page), '<p>Oui^!</p>')
})

test('settings and useTTR', () => {
  const Page = () => jsxs('p', { children: [useTTR().text('Titre : oui'), ' / Non !'] })
  assert.equal(render(Page, { locale: 'fr', locales: { fr: { spaceBefore: { '!': '' } } } }), '<p>Titre~: oui / Non!</p>')
})

test('elements created outside a render are left as written', () => {
  const outside = jsx('p', { children: 'Oui !' })
  assert.equal(show(renderToStaticMarkup(jsx(TTRProvider, { locale: 'fr', children: outside }))), '<p>Oui !</p>')
})
