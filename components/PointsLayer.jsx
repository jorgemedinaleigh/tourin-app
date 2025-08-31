import { useCallback, useRef } from "react"
import { ShapeSource, CircleLayer, SymbolLayer } from "@maplibre/maplibre-react-native"
import { useGeoData } from "../contexts/GeoDataContext"

function PointsLayer({ cameraRef, onPointPress }) {
  const { geoData } = useGeoData()
  const sourceRef = useRef(null)

  const handlePress = useCallback((e) => {
    const feature = e?.features?.[0]

    if (!feature) return

    if (onPointPress) {
      onPointPress(feature)
      return
    }
  }, [onPointPress])
  
  if (!geoData) return null

  return (
    <ShapeSource
      ref={sourceRef}
      shape={geoData}
      onPress={handlePress}
    >
      <CircleLayer
        style={{
          circleColor: "#10b981",
          circleOpacity: 0.9,
          circleRadius: 6,
          circleStrokeColor: "#ffffff",
          circleStrokeWidth: 1,
        }}
      />
    </ShapeSource>
  )
}

export default PointsLayer