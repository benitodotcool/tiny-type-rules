import { NBSP, NNBSP, UNITS } from '../chars.ts'
import type { LocaleConfig } from '../engine.ts'

/** French, after the Lexique des règles typographiques en usage à l'Imprimerie nationale. */
export const fr: LocaleConfig = {
  quotes: ['«', '»', '“', '”'],
  singleQuotes: false,
  apostrophe: '’',
  ellipsis: '…',
  spaceInsideQuotes: NBSP,
  spaceBefore: { ';': NNBSP, '!': NNBSP, '?': NNBSP, ':': NBSP },
  thousandsSeparator: NNBSP,
  unitSpace: NBSP,
  units: UNITS,
}
