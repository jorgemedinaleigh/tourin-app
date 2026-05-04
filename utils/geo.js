const EARTH_RADIUS_M = 6371000

const toRadians = (value) => (value * Math.PI) / 180
const toDegrees = (value) => (value * 180) / Math.PI

const normalizeLongitude = (longitude) => ((((longitude + 180) % 360) + 360) % 360) - 180

export const getDistanceMeters = (fromLat, fromLon, toLat, toLon) => {
  const dLat = toRadians(toLat - fromLat)
  const dLon = toRadians(toLon - fromLon)
  const lat1 = toRadians(fromLat)
  const lat2 = toRadians(toLat)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_M * c
}

export const buildCirclePolygonCoordinates = (centerLat, centerLon, radiusMeters, steps = 64) => {
  if (
    !Number.isFinite(centerLat) ||
    !Number.isFinite(centerLon) ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters <= 0
  ) {
    return []
  }

  const parsedSteps = Number(steps)
  const segmentCount = Number.isFinite(parsedSteps) ? Math.max(8, Math.floor(parsedSteps)) : 64
  const angularDistance = radiusMeters / EARTH_RADIUS_M
  const lat = toRadians(centerLat)
  const lon = toRadians(centerLon)
  const ring = []

  for (let i = 0; i < segmentCount; i += 1) {
    const bearing = (2 * Math.PI * i) / segmentCount
    const pointLat = Math.asin(
      Math.sin(lat) * Math.cos(angularDistance) +
        Math.cos(lat) * Math.sin(angularDistance) * Math.cos(bearing)
    )
    const pointLon =
      lon +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat),
        Math.cos(angularDistance) - Math.sin(lat) * Math.sin(pointLat)
      )

    ring.push([normalizeLongitude(toDegrees(pointLon)), toDegrees(pointLat)])
  }

  ring.push(ring[0])
  return ring
}
