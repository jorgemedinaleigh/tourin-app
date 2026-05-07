import { createContext, useContext, useCallback, useMemo, useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { mapHeritageSiteRow, mapRouteRow } from "../lib/supabaseAdapters"
import { buildRouteLabelMap, resolveSiteRouteLabel } from "../lib/routeLabels"
import { useI18n } from "./I18nContext"
import getLocalizedField from "../i18n/getLocalizedField"

const PAGE_LIMIT = 500

export const GeoDataContext = createContext({
  geoData: null,
  loading: false,
  error: null,
  refresh: () => {},
})

export function GeoDataProvider({ children }) {
  const { locale } = useI18n()
  const [siteRows, setSiteRows] = useState([])
  const [routeRows, setRouteRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAllRows = async (tableName, mapper) => {
    let all = []
    let offset = 0
    let keepGoing = true

    while (keepGoing) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(offset, offset + PAGE_LIMIT - 1)

      if (error) throw error

      const batch = data ?? []
      all.push(...batch.map(mapper).filter(Boolean))
      offset += PAGE_LIMIT
      keepGoing = batch.length === PAGE_LIMIT
    }

    return all
  }

  const fetchGeoData = useCallback( async () => {
    try {
      setLoading(true)
      setError(null)

      const [siteRows, routeRows] = await Promise.all([
        fetchAllRows('heritage_sites', mapHeritageSiteRow),
        fetchAllRows('routes', mapRouteRow),
      ])
      setSiteRows(siteRows)
      setRouteRows(routeRows)
    }
    catch (err) {
      if (err?.name === "AbortError") return
      setError(err?.message ?? "Error loading data")
      console.error(err.message)
    }
    finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGeoData()
  }, [fetchGeoData])

  const geoData = useMemo(() => {
    const routeLabelsById = buildRouteLabelMap(routeRows, locale)
    const features = siteRows.map((row) => {
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
          name: getLocalizedField(row, 'name', locale, { defaultValue: '' }),
          description: getLocalizedField(row, 'description', locale, { defaultValue: '' }),
          isFree: row.isFree,
          price: row.price,
          score: row.score,
          stamp: row.stamp,
          coverPhoto: row.coverPhoto,
          type: row.type,
          subType: getLocalizedField(row, 'subType', locale, { defaultValue: row.subType }),
          location: row.location,
          legalStatus: row.legalStatus,
          comuna: row.comuna,
          region: row.region,
          stampRadius: row.stampRadius,
          routeId: row.routeId || null,
          route: resolveSiteRouteLabel(row, routeLabelsById, locale),
          website: row.website,
        }
      }
    }).filter(Boolean)

    return { type: "FeatureCollection", features }
  }, [siteRows, routeRows, locale])

  const value = useMemo(
    () => ({ geoData, loading, error, refresh: fetchGeoData }),
    [geoData, loading, error, fetchGeoData]
  )

  return (
    <GeoDataContext.Provider value={value}>{children}</GeoDataContext.Provider>
  )
}

export function useGeoData() {
  return useContext(GeoDataContext)
}
