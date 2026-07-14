import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  mapAchievementRow,
  mapHeritageSiteRow,
  mapRouteRow,
} from '../lib/supabaseAdapters'
import {
  formatLocalDateKey,
  getDeviceTimeZone,
  getPreviousWeekStart,
  SUMMARY_PERIOD_TYPES,
} from '../lib/summaryPeriods'

const normalizeIds = (values) => [
  ...new Set((Array.isArray(values) ? values : []).map(String).filter(Boolean)),
]

export const mapSummaryRow = (value) => {
  const row = Array.isArray(value) ? value[0] : value
  if (!row) return null

  return {
    ...row,
    $id: row.id,
    achievementsUnlocked: Number(row.payload?.achievementsUnlocked) || 0,
    activeDays: Number(row.payload?.activeDays) || 0,
    activeWeekStreak: Number(row.payload?.activeWeekStreak) || 0,
    endsOn: row.ends_on,
    featuredSiteIds: normalizeIds(row.payload?.featuredSiteIds),
    generatedAt: row.generated_at,
    payload: row.payload || {},
    periodType: row.period_type,
    pointsEarned: Number(row.payload?.pointsEarned) || 0,
    freePlacesVisited: Number(row.payload?.freePlacesVisited) || 0,
    routesCompleted: Number(row.payload?.routesCompleted) || 0,
    sharedAt: row.shared_at,
    siteIds: normalizeIds(row.payload?.siteIds),
    sitesStamped: Number(row.payload?.sitesStamped) || 0,
    startsOn: row.starts_on,
    updatedAt: row.updated_at,
    viewedAt: row.viewed_at,
  }
}

const fetchRowsByIds = async (tableName, ids, mapper) => {
  const normalizedIds = normalizeIds(ids)
  if (!normalizedIds.length) return []

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .in('id', normalizedIds)

  if (error) throw error
  return (data ?? []).map(mapper).filter(Boolean)
}

const sortRowsByIdOrder = (rows, ids) => {
  const positions = new Map(normalizeIds(ids).map((id, index) => [id, index]))
  return [...rows].sort((left, right) =>
    (positions.get(String(left.$id)) ?? Number.MAX_SAFE_INTEGER) -
    (positions.get(String(right.$id)) ?? Number.MAX_SAFE_INTEGER)
  )
}

export function useSummaries(userId) {
  const [activeDaySummary, setActiveDaySummary] = useState(null)
  const [weeklySummary, setWeeklySummary] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getOrCreateSummary = useCallback(async (periodType, startsOn) => {
    if (!userId || !periodType || !startsOn) return null

    const { data, error: rpcError } = await supabase.rpc('get_or_create_my_summary', {
      target_period_type: periodType,
      target_starts_on: startsOn,
      requested_timezone: getDeviceTimeZone(),
    })

    if (rpcError) throw rpcError
    return mapSummaryRow(data)
  }, [userId])

  const refreshDashboardSummaries = useCallback(async () => {
    if (!userId) {
      setActiveDaySummary(null)
      setWeeklySummary(null)
      return { activeDaySummary: null, weeklySummary: null }
    }

    setLoading(true)
    setError(null)
    try {
      const today = formatLocalDateKey()
      const previousWeekStart = getPreviousWeekStart(today)
      const [nextActiveDaySummary, nextWeeklySummary] = await Promise.all([
        getOrCreateSummary(SUMMARY_PERIOD_TYPES.ACTIVE_DAY, today),
        getOrCreateSummary(SUMMARY_PERIOD_TYPES.WEEKLY, previousWeekStart),
      ])

      setActiveDaySummary(nextActiveDaySummary)
      setWeeklySummary(nextWeeklySummary)
      return {
        activeDaySummary: nextActiveDaySummary,
        weeklySummary: nextWeeklySummary,
      }
    } catch (refreshError) {
      console.error('Error fetching summaries:', refreshError)
      setError(refreshError)
      return { activeDaySummary: null, weeklySummary: null }
    } finally {
      setLoading(false)
    }
  }, [getOrCreateSummary, userId])

  const fetchHistory = useCallback(async (limit = 60) => {
    if (!userId) {
      setHistory([])
      return []
    }

    setLoading(true)
    setError(null)
    try {
      const { data, error: readError } = await supabase
        .from('user_summaries')
        .select('*')
        .eq('user_id', userId)
        .order('starts_on', { ascending: false })
        .limit(limit)

      if (readError) throw readError

      const rows = (data ?? []).map(mapSummaryRow).filter(Boolean)
      setHistory(rows)
      return rows
    } catch (readError) {
      console.error('Error fetching summary history:', readError)
      setError(readError)
      setHistory([])
      return []
    } finally {
      setLoading(false)
    }
  }, [userId])

  const getSummary = useCallback(async (summaryId) => {
    if (!userId || !summaryId) return null

    const { data, error: readError } = await supabase
      .from('user_summaries')
      .select('*')
      .eq('id', summaryId)
      .eq('user_id', userId)
      .maybeSingle()

    if (readError) throw readError
    return mapSummaryRow(data)
  }, [userId])

  const fetchSummaryDetails = useCallback(async (summary) => {
    if (!summary) return { achievements: [], routes: [], sites: [] }

    const [sites, achievements, routes] = await Promise.all([
      fetchRowsByIds('heritage_sites', summary.siteIds, mapHeritageSiteRow),
      fetchRowsByIds('achievements', summary.payload?.achievementIds, mapAchievementRow),
      fetchRowsByIds('routes', summary.payload?.routeIds, mapRouteRow),
    ])

    return {
      achievements: sortRowsByIdOrder(achievements, summary.payload?.achievementIds),
      routes: sortRowsByIdOrder(routes, summary.payload?.routeIds),
      sites: sortRowsByIdOrder(sites, summary.siteIds),
    }
  }, [])

  const getRecommendation = useCallback(async () => {
    if (!userId) return null

    const [{ data: siteData, error: siteError }, { data: routeData, error: routeError }, { data: visitData, error: visitError }] = await Promise.all([
      supabase.from('heritage_sites').select('*').eq('is_published', true),
      supabase.from('routes').select('*').eq('is_published', true),
      supabase.from('site_visits').select('site_id').eq('user_id', userId),
    ])

    if (siteError) throw siteError
    if (routeError) throw routeError
    if (visitError) throw visitError

    const sites = (siteData ?? []).map(mapHeritageSiteRow).filter(Boolean)
    const routes = (routeData ?? []).map(mapRouteRow).filter(Boolean)
    const visitedIds = new Set((visitData ?? []).map((visit) => String(visit.site_id)))
    const sitesByRoute = new Map()

    for (const site of sites) {
      const routeId = String(site.routeId || '').trim()
      if (!routeId) continue
      if (!sitesByRoute.has(routeId)) sitesByRoute.set(routeId, [])
      sitesByRoute.get(routeId).push(site)
    }

    const routeCandidates = routes
      .map((route) => {
        const routeSites = sitesByRoute.get(String(route.$id)) || []
        const visitedCount = routeSites.filter((site) => visitedIds.has(String(site.$id))).length
        return {
          route,
          routeSites,
          visitedCount,
          progress: routeSites.length ? visitedCount / routeSites.length : 0,
        }
      })
      .filter((candidate) =>
        candidate.routeSites.length > 0 && candidate.visitedCount < candidate.routeSites.length
      )
      .sort((left, right) => {
        const leftStarted = left.visitedCount > 0 ? 1 : 0
        const rightStarted = right.visitedCount > 0 ? 1 : 0
        return rightStarted - leftStarted || right.progress - left.progress
      })

    const bestRoute = routeCandidates[0]
    if (bestRoute) {
      return {
        route: bestRoute.route,
        nextSite: bestRoute.routeSites.find((site) => !visitedIds.has(String(site.$id))) || null,
        totalCount: bestRoute.routeSites.length,
        visitedCount: bestRoute.visitedCount,
      }
    }

    const nextSite = sites.find((site) => !visitedIds.has(String(site.$id)))
    return nextSite ? { nextSite, route: null, totalCount: 1, visitedCount: 0 } : null
  }, [userId])

  const markViewed = useCallback(async (summaryId) => {
    if (!summaryId) return null

    const { data, error: updateError } = await supabase.rpc('mark_my_summary_viewed', {
      target_summary_id: summaryId,
    })
    if (updateError) throw updateError
    return mapSummaryRow(data)
  }, [])

  const markShared = useCallback(async (summaryId) => {
    if (!summaryId) return null

    const { data, error: updateError } = await supabase.rpc('mark_my_summary_shared', {
      target_summary_id: summaryId,
    })
    if (updateError) throw updateError
    return mapSummaryRow(data)
  }, [])

  return {
    activeDaySummary,
    error,
    fetchHistory,
    fetchSummaryDetails,
    getOrCreateSummary,
    getRecommendation,
    getSummary,
    history,
    loading,
    markShared,
    markViewed,
    refreshDashboardSummaries,
    weeklySummary,
  }
}

export default useSummaries
