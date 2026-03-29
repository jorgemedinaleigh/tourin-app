import { Ionicons } from '@expo/vector-icons'

const ROUTE_COLORS = ['#B9654F', '#4E7C6D', '#5E759C', '#A66D3B', '#8C5E8A', '#467A94']
const FALLBACK_ICON = 'map-outline'

const trimString = (value) => (typeof value === 'string' ? value.trim() : '')

const normalizeNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const formatDecimal = (value, maxFractionDigits = 1) => {
  const parsed = normalizeNumber(value)
  if (parsed === null) return null

  const multiplier = 10 ** maxFractionDigits
  const rounded = Math.round(parsed * multiplier) / multiplier

  if (Number.isInteger(rounded)) return String(rounded)
  return rounded.toFixed(maxFractionDigits).replace(/\.?0+$/, '')
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

export const formatRouteDuration = (timeToComplete) => {
  const formatted = formatDecimal(timeToComplete, 1)
  return formatted ? `${formatted} h` : 'Por definir'
}

export const formatRouteDistance = (distance) => {
  const parsed = normalizeNumber(distance)
  if (parsed === null) return 'Por definir'

  if (parsed < 1000) {
    return `${formatDecimal(parsed, 0)} m`
  }

  const formattedKilometers = formatDecimal(parsed / 1000, 1)
  return formattedKilometers ? `${formattedKilometers} km` : 'Por definir'
}

export const normalizeRouteTags = (tags) => {
  if (!Array.isArray(tags)) return []

  const seen = new Set()
  const normalized = []

  for (const tag of tags) {
    const cleanTag = trimString(tag)
    const dedupeKey = cleanTag.toLocaleLowerCase('es')

    if (!cleanTag || seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    normalized.push(cleanTag)
  }

  return normalized
}

export const normalizeSuggestedRouteId = (routeId) => (Array.isArray(routeId) ? routeId[0] : routeId)
