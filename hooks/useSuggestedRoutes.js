import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Query } from 'react-native-appwrite'
import { tables } from '../lib/appwrite'
import {
  formatRouteDistance,
  formatRouteDuration,
  getRouteAccentColor,
  getRouteIconName,
  normalizeRouteTags,
  normalizeSuggestedRouteId,
} from '../constants/suggestedRoutes'

const DATABASE_ID = '68b399490018d7cb309b'
const ROUTES_TABLE_ID = 'routes'
const SITES_TABLE_ID = 'heritage_sites'
const PAGE_LIMIT = 100

const trimString = (value) => (typeof value === 'string' ? value.trim() : '')

const listAllRows = async (tableId, baseQueries = []) => {
  let offset = 0
  let keepGoing = true
  const allRows = []

  while (keepGoing) {
    const response = await tables.listRows({
      databaseId: DATABASE_ID,
      tableId,
      queries: [...baseQueries, Query.limit(PAGE_LIMIT), Query.offset(offset)],
    })
    const batch = response?.rows ?? []
    allRows.push(...batch)
    offset += PAGE_LIMIT
    keepGoing = batch.length === PAGE_LIMIT
  }

  return allRows
}

const normalizeStop = (row) => ({
  id: row?.$id,
  name: trimString(row?.name) || 'Parada sin nombre',
  description: trimString(row?.description),
  route: trimString(row?.route),
})

const buildStopsByRoute = (siteRows) => {
  const groupedStops = Object.create(null)

  for (const row of siteRows) {
    const stop = normalizeStop(row)
    if (!stop.route) continue

    if (!groupedStops[stop.route]) {
      groupedStops[stop.route] = []
    }

    groupedStops[stop.route].push(stop)
  }

  return groupedStops
}

const normalizeRoute = (row, stopsByRouteName) => {
  const title = trimString(row?.name) || 'Ruta sin nombre'
  const description = trimString(row?.description)
  const intensity = trimString(row?.intensity)
  const bestTime = trimString(row?.bestTime)
  const stops = stopsByRouteName[title] ?? []

  return {
    id: row?.$id,
    title,
    description,
    subtitle: bestTime ? `Mejor momento: ${bestTime}` : null,
    duration: formatRouteDuration(row?.timeToComplete),
    distance: formatRouteDistance(row?.distance),
    intensity,
    bestTime,
    tags: normalizeRouteTags(row?.tags),
    icon: getRouteIconName(row?.icon),
    accentColor: getRouteAccentColor(row?.color, title),
    stopCount: stops.length,
    stopsPreview: stops.slice(0, 3),
    stops,
  }
}

export function useSuggestedRoutes() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const alive = useRef(true)
  const setSafe = useCallback((callback) => {
    if (alive.current) callback()
  }, [])

  const fetchRoutes = useCallback(async () => {
    setSafe(() => {
      setLoading(true)
      setError(null)
    })

    try {
      const [routeRows, siteRows] = await Promise.all([
        listAllRows(ROUTES_TABLE_ID, [Query.orderAsc('name')]),
        listAllRows(SITES_TABLE_ID, [Query.isNotNull('route'), Query.orderAsc('name')]),
      ])

      const stopsByRouteName = buildStopsByRoute(siteRows)
      const normalizedRoutes = routeRows.map((row) => normalizeRoute(row, stopsByRouteName))

      setSafe(() => setRoutes(normalizedRoutes))
      return normalizedRoutes
    } catch (err) {
      console.error('[useSuggestedRoutes] fetch error', err)
      setSafe(() => {
        setError(err)
        setRoutes([])
      })
      return []
    } finally {
      setSafe(() => setLoading(false))
    }
  }, [setSafe])

  useEffect(() => {
    alive.current = true
    fetchRoutes()

    return () => {
      alive.current = false
    }
  }, [fetchRoutes])

  const getRouteById = useCallback(
    (routeId) => {
      const normalizedRouteId = normalizeSuggestedRouteId(routeId)
      return routes.find((route) => route.id === normalizedRouteId) || null
    },
    [routes]
  )

  return useMemo(
    () => ({
      routes,
      loading,
      error,
      refresh: fetchRoutes,
      getRouteById,
    }),
    [routes, loading, error, fetchRoutes, getRouteById]
  )
}

export default useSuggestedRoutes
