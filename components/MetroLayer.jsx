import { useCallback, useEffect, useRef, useState } from "react"
import { ShapeSource, CircleLayer } from "@maplibre/maplibre-react-native"
import { Query } from "react-native-appwrite"
import { tables } from "../lib/appwrite"

const DATABASE_ID = "68b399490018d7cb309b"
const TABLE_ID = "metro_stations"
const PAGE_LIMIT = 500

function MetroLayer({ onPointPress }) {
  const mountedRef = useRef(true)
  const sourceRef = useRef(null)
  const [geoData, setGeoData] = useState(null)

  const fetchAllRows = useCallback(async () => {
    let all = []
    let cursor = null
    let total = 0
    do {
      const res = await tables.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        queries: [
          Query.limit(PAGE_LIMIT),
          ...(cursor ? [Query.cursorAfter(cursor)] : []),
        ],
      })
      all.push(...res.rows)
      total = res.total ?? all.length
      cursor = res.rows.length ? res.rows[res.rows.length - 1].$id : null
    } while (cursor && all.length < total)
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

  if (!geoData || !geoData.features?.length) return null

  return (
    <ShapeSource id="metro-source" ref={sourceRef} shape={geoData} onPress={handlePress}>
      <CircleLayer
        id="metro-points"
        style={{
          circleColor: "#000000ff",
          circleOpacity: 0.9,
          circleRadius: 4,
          circleStrokeColor: "#ffffff",
          circleStrokeWidth: 1,
        }}
      />
    </ShapeSource>
  )
}

export default MetroLayer
