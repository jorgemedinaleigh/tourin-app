export const STAMP_GPS_BUFFER_METERS = 10

export const getEffectiveStampRadius = (radius) => {
  const parsedRadius = Number(radius)

  if (!Number.isFinite(parsedRadius) || parsedRadius <= 0) return null

  return parsedRadius + STAMP_GPS_BUFFER_METERS
}
