const GOOGLE_MAPS_WEB_DIRECTIONS_URL = 'https://www.google.com/maps/dir/?'
const GOOGLE_MAPS_IOS_DIRECTIONS_URL = 'comgooglemapsurl://www.google.com/maps/dir/?'
const APPLE_MAPS_DIRECTIONS_URL = 'http://maps.apple.com/?'

export const GOOGLE_MAPS_IOS_SCHEME = 'comgooglemapsurl://'
export const MAX_GOOGLE_ROUTE_STOPS = 10
export const ROUTE_MAPS_PROVIDERS = Object.freeze({
  APPLE: 'apple_maps',
  GOOGLE: 'google_maps',
})

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const buildQueryString = (params) =>
  Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&')

const serializeCoordinate = (stop) => `${stop.latitude},${stop.longitude}`

export const normalizeRouteNavigationStop = (stop) => ({
  ...stop,
  latitude: toNumber(stop?.latitude),
  longitude: toNumber(stop?.longitude),
  stopOrder: toNumber(stop?.stopOrder),
})

export const hasCompleteRouteStopNavigation = (stop) => {
  const normalizedStop = normalizeRouteNavigationStop(stop)

  return (
    normalizedStop.latitude !== null &&
    normalizedStop.longitude !== null &&
    normalizedStop.stopOrder !== null
  )
}

export const sortRouteStopsByNavigationOrder = (left, right, locale = 'en') => {
  const leftOrder = toNumber(left?.stopOrder)
  const rightOrder = toNumber(right?.stopOrder)

  if (leftOrder === null && rightOrder !== null) return 1
  if (leftOrder !== null && rightOrder === null) return -1
  if (leftOrder !== null && rightOrder !== null && leftOrder !== rightOrder) {
    return leftOrder - rightOrder
  }

  return String(left?.name || '').localeCompare(String(right?.name || ''), locale)
}

export const getOrderedRouteNavigationStops = (stops, locale = 'en') =>
  (Array.isArray(stops) ? stops : [])
    .map(normalizeRouteNavigationStop)
    .sort((left, right) => sortRouteStopsByNavigationOrder(left, right, locale))

export const getGoogleRouteStopsForExternalNavigation = (
  stops,
  maxStops = MAX_GOOGLE_ROUTE_STOPS,
  locale = 'en'
) => getOrderedRouteNavigationStops(stops, locale).slice(0, maxStops)

export const resolveRouteMapsProvider = ({ platform, supportsGoogleMapsOnIos = false }) => {
  if (platform === 'android') return ROUTE_MAPS_PROVIDERS.GOOGLE
  if (platform === 'ios' && supportsGoogleMapsOnIos) return ROUTE_MAPS_PROVIDERS.GOOGLE
  return ROUTE_MAPS_PROVIDERS.APPLE
}

export const buildGoogleMapsDirectionsUrl = (
  stops,
  { locale = 'en', travelMode = 'walking', useIosScheme = false } = {}
) => {
  const orderedStops = getOrderedRouteNavigationStops(stops, locale)
  if (!orderedStops.length) return null

  const destination = orderedStops[orderedStops.length - 1]
  const waypoints = orderedStops.slice(0, -1).map(serializeCoordinate)
  const params = {
    api: '1',
    destination: serializeCoordinate(destination),
    travelmode: travelMode,
  }

  if (waypoints.length) {
    params.waypoints = waypoints.join('|')
  }

  const query = buildQueryString(params)
  const baseUrl = useIosScheme ? GOOGLE_MAPS_IOS_DIRECTIONS_URL : GOOGLE_MAPS_WEB_DIRECTIONS_URL

  return `${baseUrl}${query}`
}

export const buildAppleMapsDirectionsUrl = (stop, { travelMode = 'walking' } = {}) => {
  const normalizedStop = normalizeRouteNavigationStop(stop)
  if (normalizedStop.latitude === null || normalizedStop.longitude === null) return null

  const query = buildQueryString({
    daddr: serializeCoordinate(normalizedStop),
    dirflg: travelMode === 'walking' ? 'w' : null,
  })

  return `${APPLE_MAPS_DIRECTIONS_URL}${query}`
}
