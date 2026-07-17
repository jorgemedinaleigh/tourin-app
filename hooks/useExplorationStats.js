import { useCallback, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getDeviceTimeZone } from '../lib/summaryPeriods'

export const EXPLORATION_STATS_PERIODS = Object.freeze({
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  ALL: 'all',
})

const VALID_PERIODS = new Set(Object.values(EXPLORATION_STATS_PERIODS))
const VALID_TIMES_OF_DAY = new Set(['morning', 'afternoon', 'evening', 'night'])

const toNumber = (value) => Number(value) || 0

const mapCategoryDistribution = (value) => (
  Array.isArray(value)
    ? value
      .map((item) => ({
        category: item?.category ?? null,
        count: toNumber(item?.count),
      }))
      .filter((item) => item.category && item.count > 0)
    : []
)

const mapExplorationStats = (value) => {
  const row = Array.isArray(value) ? value[0] : value
  if (!row) return null

  return {
    achievementCompletionRate: toNumber(row.achievementCompletionRate),
    achievementsUnlocked: toNumber(row.achievementsUnlocked),
    activeDays: toNumber(row.activeDays),
    averagePlacesPerActiveDay: toNumber(row.averagePlacesPerActiveDay),
    bestDay: row.bestDay || null,
    categoriesExplored: toNumber(row.categoriesExplored),
    categoryDistribution: mapCategoryDistribution(row.categoryDistribution),
    communesExplored: toNumber(row.communesExplored),
    currentActiveDayStreak: toNumber(row.currentActiveDayStreak),
    freePlacesRatio: toNumber(row.freePlacesRatio),
    freePlacesVisited: toNumber(row.freePlacesVisited),
    generatedAt: row.generatedAt || null,
    longestActiveDayStreak: toNumber(row.longestActiveDayStreak),
    mostActiveWeekday: Number(row.mostActiveWeekday) || null,
    period: VALID_PERIODS.has(row.period) ? row.period : EXPLORATION_STATS_PERIODS.WEEK,
    placeCompletionRate: toNumber(row.placeCompletionRate),
    preferredTimeOfDay: VALID_TIMES_OF_DAY.has(row.preferredTimeOfDay)
      ? row.preferredTimeOfDay
      : null,
    publishedAchievementsTotal: toNumber(row.publishedAchievementsTotal),
    publishedAchievementsUnlocked: toNumber(row.publishedAchievementsUnlocked),
    publishedPlacesTotal: toNumber(row.publishedPlacesTotal),
    publishedPlacesVisited: toNumber(row.publishedPlacesVisited),
    regionsExplored: toNumber(row.regionsExplored),
    routeCompletionRate: toNumber(row.routeCompletionRate),
    routesCompleted: toNumber(row.routesCompleted),
    routesStarted: toNumber(row.routesStarted),
    sitesVisited: toNumber(row.sitesVisited),
    startsAt: row.startsAt || null,
    topCategory: row.topCategory || null,
    topRegion: row.topRegion || null,
  }
}

export function useExplorationStats(userId) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const requestIdRef = useRef(0)

  const fetchStats = useCallback(async (period = EXPLORATION_STATS_PERIODS.WEEK) => {
    const normalizedPeriod = VALID_PERIODS.has(period)
      ? period
      : EXPLORATION_STATS_PERIODS.WEEK
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (!userId) {
      setStats(null)
      setError(null)
      setLoading(false)
      return null
    }

    setLoading(true)
    setError(null)
    setStats(null)

    try {
      const { data, error: statsError } = await supabase.rpc('get_my_exploration_stats', {
        requested_timezone: getDeviceTimeZone(),
        target_period: normalizedPeriod,
      })

      if (statsError) throw statsError

      const nextStats = mapExplorationStats(data)
      if (requestIdRef.current === requestId) setStats(nextStats)
      return nextStats
    } catch (statsError) {
      if (requestIdRef.current === requestId) {
        console.error('Error fetching exploration stats:', statsError)
        setError(statsError)
        setStats(null)
      }
      return null
    } finally {
      if (requestIdRef.current === requestId) setLoading(false)
    }
  }, [userId])

  return {
    error,
    fetchStats,
    loading,
    stats,
  }
}

export default useExplorationStats
