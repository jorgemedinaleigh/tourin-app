import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { mapHeritageSiteRow, mapRouteRow } from '../lib/supabaseAdapters'
import { useI18n } from '../contexts/I18nContext'
import getLocalizedField from '../i18n/getLocalizedField'
import {
  normalizeRouteNavigationStop,
  sortRouteStopsByNavigationOrder,
} from '../lib/routeNavigation'
import {
  formatRouteDistance,
  formatRouteDuration,
  getRouteAccentColor,
  getRouteIconName,
  normalizeRouteTags,
  normalizeSuggestedRouteId,
} from '../constants/suggestedRoutes'

const PAGE_LIMIT = 100

const trimString = (value) => (typeof value === 'string' ? value.trim() : '')

const sortByTitle = (left, right, locale) =>
  String(left?.title || '').localeCompare(String(right?.title || ''), locale)

const listAllRows = async (tableName, mapper) => {
  let offset = 0
  let keepGoing = true
  const allRows = []

  while (keepGoing) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + PAGE_LIMIT - 1)

    if (error) throw error

    const batch = data ?? []
    allRows.push(...batch.map(mapper).filter(Boolean))
    offset += PAGE_LIMIT
    keepGoing = batch.length === PAGE_LIMIT
  }

  return allRows
}

const getRouteJoinKey = (row) => trimString(row?.routeId) || trimString(row?.route)

const normalizeStop = (row, locale, t) => ({
  ...normalizeRouteNavigationStop({
    latitude: row?.latitude,
    longitude: row?.longitude,
    stopOrder: row?.stopOrder,
  }),
  id: row?.$id,
  description: getLocalizedField(row, 'description', locale, { defaultValue: '' }),
  name: getLocalizedField(row, 'name', locale, {
    defaultValue: t('routes:fallbackStopTitle'),
  }),
  routeKey: getRouteJoinKey(row),
})

const buildStopsByRoute = (siteRows, locale, t) => {
  const groupedStops = Object.create(null)

  for (const row of siteRows) {
    const stop = normalizeStop(row, locale, t)
    if (!stop.routeKey) continue

    if (!groupedStops[stop.routeKey]) {
      groupedStops[stop.routeKey] = []
    }

    groupedStops[stop.routeKey].push(stop)
  }

  return groupedStops
}

const dedupeStops = (stops) => {
  const seen = new Set()
  const dedupedStops = []

  for (const stop of stops) {
    const key = stop?.id || `${stop?.name}-${stop?.description}`
    if (seen.has(key)) continue

    seen.add(key)
    dedupedStops.push(stop)
  }

  return dedupedStops
}

const normalizeRoute = (row, stopsByRouteKey, locale, t) => {
  const title = getLocalizedField(row, 'name', locale, { defaultValue: t('routes:fallbackTitle') })
  const legacyTitle = trimString(row?.name)
  const description = getLocalizedField(row, 'description', locale, { defaultValue: '' })
  const rawBestTime = getLocalizedField(row, 'bestTime', locale, { defaultValue: '' })
  const intensity = getLocalizedField(row, 'intensity', locale, {
    defaultValue: t('common:fallbacks.undefined'),
  })
  const bestTime = rawBestTime || t('common:fallbacks.undefined')
  const routeStops = dedupeStops([
    ...(stopsByRouteKey[row?.$id] ?? []),
    ...(legacyTitle ? stopsByRouteKey[legacyTitle] ?? [] : []),
  ]).sort((left, right) => sortRouteStopsByNavigationOrder(left, right, locale))

  return {
    id: row?.$id,
    title,
    description,
    subtitle: rawBestTime ? t('routes:bestTimeLabel', { bestTime: rawBestTime }) : null,
    duration: formatRouteDuration(row?.timeToComplete, locale, {
      fallbackLabel: t('common:fallbacks.undefined'),
      hourUnit: 'h',
    }),
    distance: formatRouteDistance(row?.distance, locale, {
      fallbackLabel: t('common:fallbacks.undefined'),
      kilometerUnit: 'km',
      meterUnit: 'm',
    }),
    intensity,
    bestTime,
    tags: normalizeRouteTags(getLocalizedField(row, 'tags', locale, { defaultValue: [] }), locale),
    icon: getRouteIconName(row?.icon),
    accentColor: getRouteAccentColor(row?.color, title),
    stopCount: routeStops.length,
    stopsPreview: routeStops.slice(0, 3),
    stops: routeStops,
  }
}

export function useSuggestedRoutes() {
  const { locale } = useI18n()
  const { t } = useTranslation(['common', 'routes'])
  const [routeRows, setRouteRows] = useState([])
  const [siteRows, setSiteRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchRoutes = useCallback(async (options) => {
    const signal = options?.signal

    setLoading(true)
    setError(null)

    try {
      const [routeRows, siteRows] = await Promise.all([
        listAllRows('routes', mapRouteRow),
        listAllRows('heritage_sites', mapHeritageSiteRow),
      ])

      if (signal?.aborted) return

      setRouteRows(routeRows)
      setSiteRows(siteRows)
      return routeRows
    } catch (err) {
      if (signal?.aborted) return

      console.error('[useSuggestedRoutes] fetch error', err)
      setError(err)
      setRouteRows([])
      setSiteRows([])
      return []
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const abortController = new AbortController()
    fetchRoutes({ signal: abortController.signal })

    return () => {
      abortController.abort()
    }
  }, [fetchRoutes])

  const routes = useMemo(() => {
    const stopsByRouteKey = buildStopsByRoute(siteRows, locale, t)

    return routeRows
      .map((row) => normalizeRoute(row, stopsByRouteKey, locale, t))
      .sort((left, right) => sortByTitle(left, right, locale))
  }, [routeRows, siteRows, locale, t])

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
