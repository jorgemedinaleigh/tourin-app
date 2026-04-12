import { DEFAULT_LOCALE, normalizeLocale } from './formatters'

const hasValue = (value) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0

  return true
}

const normalizeValue = (value) => (typeof value === 'string' ? value.trim() : value)

export const getLocalizedField = (row, key, locale, options = {}) => {
  const fallbackLocale = normalizeLocale(options.fallbackLocale || DEFAULT_LOCALE)
  const normalizedLocale = normalizeLocale(locale)
  const candidates = [
    row?.[`${key}_${normalizedLocale}`],
    normalizedLocale !== fallbackLocale ? row?.[`${key}_${fallbackLocale}`] : undefined,
    row?.[key],
  ]

  for (const candidate of candidates) {
    if (hasValue(candidate)) {
      return normalizeValue(candidate)
    }
  }

  return options.defaultValue
}

export default getLocalizedField
