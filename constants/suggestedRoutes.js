import { Ionicons } from '@expo/vector-icons'
import { getLocaleTag } from '../i18n/formatters'

const ROUTE_COLORS = ['#B9654F', '#4E7C6D', '#5E759C', '#A66D3B', '#8C5E8A', '#467A94']
const FALLBACK_ICON = 'map-outline'

const trimString = (value) => (typeof value === 'string' ? value.trim() : '')

const normalizeNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const formatDecimal = (value, locale, maxFractionDigits = 1) => {
  const parsed = normalizeNumber(value)
  if (parsed === null) return null

  return new Intl.NumberFormat(getLocaleTag(locale), {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  }).format(parsed)
}

const hashString = (value) => {
  const input = trimString(value)
  if (!input) return 0

  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

export const getRouteAccentColor = (colorValue, fallbackSeed = '') => {
  const normalizedColor = trimString(colorValue)

  if (/^#[0-9A-Fa-f]{6}$/.test(normalizedColor)) {
    return normalizedColor
  }

  const colorIndex = hashString(fallbackSeed) % ROUTE_COLORS.length
  return ROUTE_COLORS[colorIndex]
}

export const getRouteIconName = (iconName) => {
  const normalizedIcon = trimString(iconName)
  if (normalizedIcon && Ionicons.glyphMap?.[normalizedIcon]) {
    return normalizedIcon
  }
  return FALLBACK_ICON
}

export const formatRouteDuration = (timeToComplete, locale, options = {}) => {
  const formatted = formatDecimal(timeToComplete, locale, 1)
  return formatted ? `${formatted} ${options.hourUnit || 'h'}` : options.fallbackLabel || ''
}

export const formatRouteDistance = (distance, locale, options = {}) => {
  const parsed = normalizeNumber(distance)
  if (parsed === null) return options.fallbackLabel || ''

  if (parsed < 1000) {
    return `${formatDecimal(parsed, locale, 0)} ${options.meterUnit || 'm'}`
  }

  const formattedKilometers = formatDecimal(parsed / 1000, locale, 1)
  return formattedKilometers
    ? `${formattedKilometers} ${options.kilometerUnit || 'km'}`
    : options.fallbackLabel || ''
}

export const normalizeRouteTags = (tags, locale = 'es') => {
  const tagList = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : []

  if (!tagList.length) return []

  const seen = new Set()
  const normalized = []

  for (const tag of tagList) {
    const cleanTag = trimString(tag)
    const dedupeKey = cleanTag.toLocaleLowerCase(getLocaleTag(locale))

    if (!cleanTag || seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    normalized.push(cleanTag)
  }

  return normalized
}

export const normalizeSuggestedRouteId = (routeId) => (Array.isArray(routeId) ? routeId[0] : routeId)
