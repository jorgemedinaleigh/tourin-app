import { useCallback, useRef, useState } from "react"
import { ShapeSource, CircleLayer } from "@maplibre/maplibre-react-native"
import { useGeoData } from "../contexts/GeoDataContext"

function PointsLayer({ onPointPress }) {
  const { geoData } = useGeoData()
  const sourceRef = useRef(null)

  const handlePress = useCallback((e) => {
    const feature = e?.features?.[0]
    if (!feature) return
    
    if (onPointPress) onPointPress(feature)
  }, [onPointPress])

  if (!geoData || !geoData.features?.length) return null

  return (
    <>
      <ShapeSource id="heritage-source" ref={sourceRef} shape={geoData} onPress={handlePress}>
        <CircleLayer
          id="heritage-points"
          style={{
            circleColor: "#10b981",
            circleOpacity: 0.9,
            circleRadius: 6,
            circleStrokeColor: "#ffffff",
            circleStrokeWidth: 1,
          }}
        />
      </ShapeSource>
    </>
  )
}

export default PointsLayer