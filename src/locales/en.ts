import { UNITS } from '../chars.ts'
import type { LocaleConfig } from '../engine.ts'

/** English, US and UK alike: double quotes first, no space before punctuation. */
export const en = {
  quotes: ['“', '”', '‘', '’'],
  singleQuotes: ['‘', '’'],
  apostrophe: '’',
  ellipsis: '…',
  spaceInsideQuotes: false,
  spaceBefore: { ',': '', ';': '', '!': '', '?': '', ':': '' },
  thousandsSeparator: false,
  unitSpace: false,
  units: UNITS,
  abbreviationSpace: false,
  abbreviations: ['Mr.', 'Mrs.', 'Ms.', 'Mx.', 'Dr.', 'Prof.', 'St.', 'No.', 'p.', 'pp.', '§', 'fig.', 'vol.', 'ch.'],
  dash: false,
  widowSpace: false,
  replacements: {},
} satisfies LocaleConfig
