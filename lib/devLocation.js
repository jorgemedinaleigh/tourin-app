const parseNumber = (value) => {
  if (value === undefined || value === null) return null

  const normalized = String(value).trim()
  if (!normalized.length) return null

  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}

const parseFirstNumber = (...values) => {
  for (const value of values) {
    const number = parseNumber(value)
    if (Number.isFinite(number)) return number
  }

  return null
}

const isDevelopmentRuntime = typeof __DEV__ !== 'undefined'
  ? __DEV__
  : process.env.NODE_ENV === 'development'

const buildDevLocationOverride = () => {
  if (!isDevelopmentRuntime) return null

  const latitude = parseFirstNumber(
    process.env.EXPO_PUBLIC_DEV_LOCATION_LAT,
    process.env.EXPO_PUBLIC_DEV_LOCATION_LATITUDE
  )
  const longitude = parseFirstNumber(
    process.env.EXPO_PUBLIC_DEV_LOCATION_LON,
    process.env.EXPO_PUBLIC_DEV_LOCATION_LNG,
    process.env.EXPO_PUBLIC_DEV_LOCATION_LONGITUDE
  )
  const accuracy = parseNumber(process.env.EXPO_PUBLIC_DEV_LOCATION_ACCURACY)

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null
  }

  return Object.freeze({
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) && accuracy > 0 ? accuracy : 5,
  })
}

const devLocationOverride = buildDevLocationOverride()

export const isDevLocationOverrideEnabled = Boolean(devLocationOverride)

export const getDevLocationOverrideCoordinate = () => {
  if (!devLocationOverride) return null

  return [devLocationOverride.longitude, devLocationOverride.latitude]
}

export const getDevLocationOverridePosition = () => {
  if (!devLocationOverride) return null

  return {
    coords: {
      latitude: devLocationOverride.latitude,
      longitude: devLocationOverride.longitude,
      accuracy: devLocationOverride.accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
    mocked: true,
  }
}
