/** U+00A0 no-break space: word-wide, never wraps. */
export const NBSP = ' '
/** U+202F narrow no-break space: the French "espace fine insécable". */
export const NNBSP = ' '
/** U+2009 thin space. Breakable: wrap it in a rule only next to a non-breaking one. */
export const THIN_SPACE = ' '
/** U+200A hair space, the thinnest. Breakable. */
export const HAIR_SPACE = ' '

/** Units and symbols kept on the same line as the number before them. */
export const UNITS: readonly string[] = [
  '%', '‰', '€', '$', '£', '¥', '°', '°C', '°F',
  'mm', 'cm', 'm', 'km', 'm²', 'm³', 'km²', 'km/h',
  'mg', 'g', 'kg', 't', 'ml', 'cl', 'l', 'L',
  'ms', 's', 'min', 'h',
  'o', 'ko', 'Ko', 'Mo', 'Go', 'To', 'B', 'kB', 'KB', 'MB', 'GB', 'TB',
  'W', 'kW', 'kWh', 'V', 'A', 'Hz', 'kHz', 'MHz', 'GHz',
  'px', 'pt', 'em', 'rem',
]
