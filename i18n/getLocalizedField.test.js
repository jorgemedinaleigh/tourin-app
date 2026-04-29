import test from 'node:test'
import assert from 'node:assert/strict'
import { getLocalizedField } from './getLocalizedField'

const runCase = ({ name, row, key = 'name', locale = 'es', options, expected }) => {
  test(name, () => {
    assert.deepEqual(getLocalizedField(row, key, locale, options), expected)
  })
}

runCase({
  name: 'returns active locale legacy suffix first when present',
  row: { name: { es: 'Objeto ES', en: 'Object EN' }, name_es: '  Legado ES  ' },
  expected: 'Legado ES',
})

runCase({
  name: 'falls back to fallback locale legacy suffix before localized object',
  row: { name: { en: 'Object EN' }, name_en: ' Legacy EN ' },
  locale: 'pt',
  options: { fallbackLocale: 'en' },
  expected: 'Legacy EN',
})

runCase({
  name: 'uses localized object active locale when suffixes are missing',
  row: { name: { es: '  Objeto ES  ', en: 'Object EN' } },
  locale: 'es',
  expected: 'Objeto ES',
})

runCase({
  name: 'uses localized object fallback locale when active locale value missing',
  row: { name: { en: 'Object EN' } },
  locale: 'pt',
  options: { fallbackLocale: 'en' },
  expected: 'Object EN',
})

runCase({
  name: 'uses non-object raw value when no localized candidates contain value',
  row: { name: '  Valor directo  ' },
  locale: 'es',
  expected: 'Valor directo',
})

runCase({
  name: 'returns defaultValue for null and empty-string candidates',
  row: { name: null, name_es: '   ', name_en: '' },
  locale: 'es',
  options: { defaultValue: 'Sin valor' },
  expected: 'Sin valor',
})

runCase({
  name: 'returns defaultValue for empty arrays',
  row: { name: [], name_es: [] },
  locale: 'es',
  options: { defaultValue: 'Array vacío' },
  expected: 'Array vacío',
})

runCase({
  name: 'returns non-empty arrays as valid values',
  row: { name: ['uno', 'dos'] },
  locale: 'es',
  expected: ['uno', 'dos'],
})

runCase({
  name: 'regression: legacy suffix precedence beats localized object',
  row: {
    title_pt: 'Sufijo PT',
    title: { pt: 'Objeto PT', en: 'Object EN' },
  },
  key: 'title',
  locale: 'pt',
  expected: 'Sufijo PT',
})
