import { DEFAULT_LOCALE, normalizeLocale } from './formatters'

const hasValue = (value) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0

  return true
}

const normalizeValue = (value) => (typeof value === 'string' ? value.trim() : value)

const isLocalizedObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value)

export const getLocalizedField = (row, key, locale, options = {}) => {
  const fallbackLocale = normalizeLocale(options.fallbackLocale || DEFAULT_LOCALE)
  const normalizedLocale = normalizeLocale(locale)
  const rawValue = row?.[key]
  const localizedCandidates = isLocalizedObject(rawValue)
    ? [
        rawValue[normalizedLocale],
        normalizedLocale !== fallbackLocale ? rawValue[fallbackLocale] : undefined,
        rawValue[DEFAULT_LOCALE],
        rawValue.es,
        rawValue.en,
        rawValue.pt,
      ]
    : []
  const candidates = [
    row?.[`${key}_${normalizedLocale}`],
    normalizedLocale !== fallbackLocale ? row?.[`${key}_${fallbackLocale}`] : undefined,
    ...localizedCandidates,
    isLocalizedObject(rawValue) ? undefined : rawValue,
  ]

  for (const candidate of candidates) {
    if (hasValue(candidate)) {
      return normalizeValue(candidate)
    }
  }

  return options.defaultValue
}

export default getLocalizedField
