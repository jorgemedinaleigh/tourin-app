import { memo, useCallback } from "react"
import { Ionicons } from "@expo/vector-icons"
import { PointAnnotation } from "@maplibre/maplibre-react-native"
import { useGeoData } from "../contexts/GeoDataContext"

const DEFAULT_PIN_COLOR = '#e03939ff'
const VISITED_PIN_COLOR = 'rgb(0, 0, 0)'

function PointsLayer({ onPointPress, visitedSiteIds }) {
  const { geoData } = useGeoData()

  const handlePress = useCallback((feature) => {
    if (!feature) return

    if (onPointPress) onPointPress(feature)
  }, [onPointPress])

  if (!geoData || !geoData.features?.length) return null

  return (
    <>
      {geoData.features.map((feature, index) => {
        const coordinates = feature.geometry?.coordinates
        if (!coordinates?.length) return null
        const baseId = feature.properties?.id ?? feature.id ?? `point-${index}`
        const markerId = `heritage-${baseId}`
        const isVisited = visitedSiteIds?.has(String(baseId))

        return (
          <PointAnnotation
            key={markerId}
            id={markerId}
            coordinate={coordinates}
            onSelected={() => handlePress(feature)}
          >
            <Ionicons
              name="location-sharp"
              size={30}
              color={isVisited ? VISITED_PIN_COLOR : DEFAULT_PIN_COLOR}
            />
          </PointAnnotation>
        )
      })}
    </>
  )
}

export default memo(PointsLayer)
