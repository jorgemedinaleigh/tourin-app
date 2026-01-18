import { useCallback } from "react"
import { Ionicons } from "@expo/vector-icons"
import { PointAnnotation } from "@maplibre/maplibre-react-native"
import { useGeoData } from "../contexts/GeoDataContext"

function PointsLayer({ onPointPress }) {
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

        return (
          <PointAnnotation
            key={markerId}
            id={markerId}
            coordinate={coordinates}
            onSelected={() => handlePress(feature)}
          >
            <Ionicons name="location-sharp" size={20} color="#e03939ff" />
          </PointAnnotation>
        )
      })}
    </>
  )
}

export default PointsLayer
