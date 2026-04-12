export const DEFAULT_LOCALE = 'es'
export const SUPPORTED_LOCALES = ['es', 'en']

const LOCALE_TAGS = {
  es: 'es-CL',
  en: 'en-US',
}

export const normalizeLocale = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase()
  const baseLocale = normalizedValue.split('-')[0]

  return SUPPORTED_LOCALES.includes(baseLocale) ? baseLocale : DEFAULT_LOCALE
}

export const getLocaleTag = (locale) => LOCALE_TAGS[normalizeLocale(locale)] || LOCALE_TAGS[DEFAULT_LOCALE]

const toDate = (value) => {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDate = (value, locale, options = { dateStyle: 'medium' }) => {
  const date = toDate(value)
  if (!date) return ''

  return new Intl.DateTimeFormat(getLocaleTag(locale), options).format(date)
}

export const formatMonthYear = (value, locale) => {
  const date = toDate(value)
  if (!date) return ''

  return new Intl.DateTimeFormat(getLocaleTag(locale), {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export const formatUppercaseShortDate = (value, locale) => {
  const date = toDate(value)
  if (!date) return ''

  const formatter = new Intl.DateTimeFormat(getLocaleTag(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const parts = formatter.formatToParts(date)
  const day = parts.find((part) => part.type === 'day')?.value?.padStart(2, '0')
  const month = parts
    .find((part) => part.type === 'month')
    ?.value?.replace(/\.$/, '')
    ?.toLocaleUpperCase(getLocaleTag(locale))
  const year = parts.find((part) => part.type === 'year')?.value

  if (!day || !month || !year) {
    return formatter.format(date).toLocaleUpperCase(getLocaleTag(locale))
  }

  return `${day}-${month}-${year}`
}

export const formatNumber = (value, locale, options) => {
  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue)) return ''

  return new Intl.NumberFormat(getLocaleTag(locale), options).format(parsedValue)
}
