import { useCallback, useEffect, useRef, useState } from "react"
import { ShapeSource, SymbolLayer, Images } from "@maplibre/maplibre-react-native"
import { supabase } from "../lib/supabase"
import { mapMetroStationRow } from "../lib/supabaseAdapters"

const PAGE_LIMIT = 500
const MIN_ZOOM = 14
const METRO_ICON_ID = "metro-icon"
// Set a local image when you choose a metro icon, e.g. require("../assets/metro-icon.png").
const METRO_ICON_ASSET = require("../assets/letter-m.png")
const METRO_ICON_SIZE = 0.8

function MetroLayer({ onPointPress }) {
  const mountedRef = useRef(true)
  const sourceRef = useRef(null)
  const [geoData, setGeoData] = useState(null)
  const hasIcon = Boolean(METRO_ICON_ASSET)

  const fetchAllRows = useCallback(async () => {
    let all = []
    let offset = 0
    let keepGoing = true

    while (keepGoing) {
      const { data, error } = await supabase
        .from('metro_stations')
        .select('*')
        .range(offset, offset + PAGE_LIMIT - 1)

      if (error) throw error

      const batch = data ?? []
      all.push(...batch.map(mapMetroStationRow).filter(Boolean))
      offset += PAGE_LIMIT
      keepGoing = batch.length === PAGE_LIMIT
    }

    return all
  }, [])

  const fetchMetroData = useCallback(async () => {
    try {
      const rows = await fetchAllRows()
      const features = rows.map((row) => {
        const lat = Number(row.latitude)
        const lon = Number(row.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [lon, lat],
          },
          properties: {
            id: row.$id,
            name: row.stationName,
            stationName: row.stationName,
            line: row.line,
            isOperational: row.isOperational,
          },
        }
      }).filter(Boolean)

      if (mountedRef.current) {
        setGeoData({ type: "FeatureCollection", features })
      }
    } catch (err) {
      if (err?.name === "AbortError") return
      console.error(err?.message ?? "Error cargando estaciones de metro")
    }
  }, [fetchAllRows])

  useEffect(() => {
    mountedRef.current = true
    fetchMetroData()
    return () => {
      mountedRef.current = false
    }
  }, [fetchMetroData])

  const handlePress = useCallback((e) => {
    const feature = e?.features?.[0]
    if (!feature) return

    if (onPointPress) onPointPress(feature)
  }, [onPointPress])

  const hasFeatures = Boolean(geoData?.features?.length)
  if (!hasFeatures && !hasIcon) return null

  return (
    <>
      {hasIcon ? (
        <Images
          id="metro-images"
          images={{ [METRO_ICON_ID]: METRO_ICON_ASSET }}
          onImageMissing={(imageKey) => {
            console.warn(`MetroLayer: no se encontro el icono "${imageKey}"`)
          }}
        />
      ) : null}
      {hasFeatures ? (
        <ShapeSource id="metro-source" ref={sourceRef} shape={geoData} onPress={handlePress}>
          <SymbolLayer
            id="metro-points"
            minZoomLevel={MIN_ZOOM}
            style={
              hasIcon
                ? {
                    iconImage: METRO_ICON_ID,
                    iconSize: METRO_ICON_SIZE,
                    iconAllowOverlap: true,
                    iconIgnorePlacement: true,
                    iconAnchor: "center",
                  }
                : {
                    textField: "M",
                    textSize: 8,
                    textColor: "#000000",
                    textAllowOverlap: true,
                    textAnchor: "center",
                  }
            }
          />
        </ShapeSource>
      ) : null}
    </>
  )
}

export default MetroLayer
