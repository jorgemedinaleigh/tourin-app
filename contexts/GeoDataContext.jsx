import { createContext, useContext, useCallback, useMemo, useState, useEffect } from "react"
import { Query } from "react-native-appwrite"
import { tables } from "../lib/appwrite"

const DATABASE_ID = '68b399490018d7cb309b'
const TABLE_ID = 'heritage_sites'
const PAGE_LIMIT = 500

export const GeoDataContext = createContext({
  geoData: null,
  loading: false,
  error: null,
  refresh: () => {},
})

export function GeoDataProvider({ children }) {
  const [geoData, setGeoData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAllRows = async () => {
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
  }

  const fetchGeoData = useCallback( async () => {
    try {
      setLoading(true)
      setError(null)

      const rows = await fetchAllRows()
      const features = rows.map((row) => {
        const lat = Number(row.latitude)
        const lon = Number(row.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

        return {
          type: "Feature",
          geometry: { 
            type: "Point",
            coordinates: [lon, lat]
          },
          properties: {
            id: row.$id,
            name: row.name,
            description: row.description,
            isFree: row.isFree,
            price: row.price,
            score: row.score,
            stamp: row.stamp,
            type: row.type,
            subType: row.subType,
            location: row.location,
            legalStatus: row.legalStatus,
            comuna: row.comuna,
            region: row.region,
            stampRadius: row.stampRadius,
            route: row.route,
          }
        }
      }).filter(Boolean)
      setGeoData({ type: "FeatureCollection", features })
    }
    catch (err) {
      if (err?.name === "AbortError") return
      setError(err?.message ?? "Error cargando datos")
      console.error(err.message)
    }
    finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGeoData()
    console.log(geoData)
  }, [fetchGeoData])

  const value = useMemo(() => (
    {geoData, loading, error, refresh: fetchGeoData}),
    [geoData, loading, error, fetchGeoData]
  )

  return (
    <GeoDataContext.Provider value={value}>{children}</GeoDataContext.Provider>
  )
}

export function useGeoData() {
  return useContext(GeoDataContext)
}
