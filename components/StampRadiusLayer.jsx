import { useMemo } from "react"
import { FillLayer, LineLayer, ShapeSource } from "@maplibre/maplibre-react-native"
import { useGeoData } from "../contexts/GeoDataContext"
import { buildCirclePolygonCoordinates, getDistanceMeters } from "../utils/geo"

const SOURCE_ID = "stamp-radius-source"
const FILL_LAYER_ID = "stamp-radius-fill"
const LINE_LAYER_ID = "stamp-radius-line"
const CIRCLE_SEGMENTS = 64

const fillStyle = {
  fillColor: "#22c55e",
  fillOpacity: 0.18,
}

const lineStyle = {
  lineColor: "#16a34a",
  lineOpacity: 0.85,
  lineWidth: 2,
}

function StampRadiusLayer({ userCoordinate }) {
  const { geoData } = useGeoData()

  const radiusData = useMemo(() => {
    if (!Array.isArray(userCoordinate) || userCoordinate.length !== 2) return null

    const [userLon, userLat] = userCoordinate
    if (!Number.isFinite(userLat) || !Number.isFinite(userLon)) return null

    const features = (geoData?.features ?? []).map((feature) => {
      const coordinates = feature.geometry?.coordinates
      const [siteLon, siteLat] = Array.isArray(coordinates) ? coordinates : []
      const radius = Number(feature.properties?.stampRadius)

      if (
        !Number.isFinite(siteLat) ||
        !Number.isFinite(siteLon) ||
        !Number.isFinite(radius) ||
        radius <= 0
      ) {
        return null
      }

      const distance = getDistanceMeters(userLat, userLon, siteLat, siteLon)
      if (!Number.isFinite(distance) || distance > radius) return null

      const ring = buildCirclePolygonCoordinates(siteLat, siteLon, radius, CIRCLE_SEGMENTS)
      if (!ring.length) return null

      return {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [ring],
        },
        properties: {
          id: feature.properties?.id,
          stampRadius: radius,
          distanceMeters: Math.round(distance),
        },
      }
    }).filter(Boolean)

    if (!features.length) return null

    return {
      type: "FeatureCollection",
      features,
    }
  }, [geoData, userCoordinate])

  if (!radiusData) return null

  return (
    <ShapeSource id={SOURCE_ID} shape={radiusData}>
      <FillLayer id={FILL_LAYER_ID} style={fillStyle} />
      <LineLayer id={LINE_LAYER_ID} style={lineStyle} />
    </ShapeSource>
  )
}

export default StampRadiusLayer
