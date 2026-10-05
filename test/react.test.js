import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { createTypo } from '../src/index.ts'
import { defineTypo, Typo, TypoProvider, useTypo } from '../src/react/index.ts'

const nb = (s) => s.replaceAll('~', ' ').replaceAll('^', ' ')
const render = (node) => renderToStaticMarkup(node)

test('Typo fixes its text across inline elements', () => {
  assert.equal(
    render(h(Typo, { locale: 'fr' }, 'Il a dit : "', h('em', null, 'oui'), '" !')),
    nb('Il a dit~: «~<em>oui</em>~»^!'),
  )
  assert.equal(render(h('h1', null, h(Typo, { locale: 'en' }, "It's 3 o'clock..."))), '<h1>It’s 3 o’clock…</h1>')
})

test('Typo leaves code, other languages and opted-out elements alone', () => {
  assert.equal(
    render(h(Typo, { locale: 'fr' }, 'Lancez ', h('code', null, 'a : "b"'), ' !')),
    nb('Lancez <code>a : &quot;b&quot;</code>^!'),
  )
  assert.equal(render(h(Typo, { locale: 'fr' }, h('span', { lang: 'en' }, 'Yes !'), ' Oui !')), nb('<span lang="en">Yes !</span> Oui^!'))
  assert.equal(render(h(Typo, { locale: 'fr' }, h('b', { 'data-prevent-ttr': '' }, 'Non !'))), '<b data-prevent-ttr="">Non !</b>')
})

test('Typo renders fixed HTML', () => {
  assert.equal(render(h(Typo, { locale: 'fr', html: '<p>Oui !</p>', as: 'section', className: 'x' })), nb('<section class="x"><p>Oui^!</p></section>'))
})

test('Typo without locale or text renders its children as they are', () => {
  assert.equal(render(h(Typo, null, 'Oui !')), 'Oui !')
  assert.equal(render(h(Typo, { locale: 'fr' }, h('img', { alt: 'Oui !' }))), '<img alt="Oui !"/>')
})

test('defineTypo binds settings and a default locale', () => {
  const { Typo: MyTypo, typo } = defineTypo({ locale: 'fr', locales: { fr: { spaceBefore: { '!': '' } } } })
  assert.equal(render(h(MyTypo, null, 'Oui ! Non ?')), nb('Oui! Non^?'))
  assert.equal(typo.text('Oui !'), 'Oui!')
})

test('useTypo reads the provider, or falls back to the built-in fixer', () => {
  const Title = () => h('h1', null, useTypo().text('Oui !'))
  assert.equal(render(h(TypoProvider, { locale: 'fr' }, h(Title))), nb('<h1>Oui^!</h1>'))
  assert.equal(render(h(Title)), '<h1>Oui !</h1>')
  assert.equal(render(h(TypoProvider, { locale: 'fr', locales: { fr: { spaceBefore: { '!': '' } } } }, h(Title))), '<h1>Oui!</h1>')
})

test('Typo accepts a custom fixer', () => {
  assert.equal(render(h(Typo, { typo: createTypo({ locale: 'en' }) }, 'Hi !')), 'Hi!')
})
