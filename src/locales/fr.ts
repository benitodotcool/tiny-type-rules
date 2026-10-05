import { NBSP, NNBSP, UNITS } from '../chars.ts'
import type { LocaleConfig } from '../engine.ts'

/**
 * French, after the Lexique des règles typographiques en usage à l'Imprimerie nationale.
 * Numbers, units and abbreviations are opt-in: their space only stops a line break.
 */
export const fr = {
  quotes: ['«', '»', '“', '”'],
  singleQuotes: false,
  apostrophe: '’',
  ellipsis: '…',
  spaceInsideQuotes: NBSP,
  spaceBefore: { ',': '', ';': NNBSP, '!': NNBSP, '?': NNBSP, ':': NBSP },
  thousandsSeparator: false,
  unitSpace: false,
  units: UNITS,
  abbreviationSpace: false,
  abbreviations: ['M.', 'MM.', 'Mme', 'Mmes', 'Mlle', 'Mlles', 'Me', 'Dr', 'Pr', 'St', 'Ste', 'n°', 'p.', 'pp.', '§', 'art.', 'chap.', 'fig.', 'vol.'],
  dash: false,
  widowSpace: false,
  replacements: {},
} satisfies LocaleConfig
