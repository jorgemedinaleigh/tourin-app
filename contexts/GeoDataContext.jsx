import { createContext, useContext, useRef, useState, useEffect } from "react"

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
  const abortRef = useRef(null)

  async function fetchGeoData() {
    try {
      setLoading(true)
      setError(null)

    }
    catch (err) {
      if (err?.name === "AbortError") return
      setError(err?.message ?? "Error cargando datos")
      console.error(err.message)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGeoData()
    return () => abortRef.current?.abort?.()
  }, [fetchGeoData])

  const value = {geoData, loading, error, refresh: fetchGeoData}

  return (
    <GeoDataContext.Provider value={value}>{children}</GeoDataContext.Provider>
  )
}

export function useGeoData() {
  return useContext(GeoDataContext)
}