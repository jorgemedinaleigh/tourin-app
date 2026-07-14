import { useCallback, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  mapAchievementRow,
  mapHeritageSiteRow,
  mapRouteRow,
  mapSiteVisitRow,
  mapUserAchievementRow,
} from '../lib/supabaseAdapters'
import { posthog } from '../lib/posthog'
import { useI18n } from '../contexts/I18nContext'
import getLocalizedField from '../i18n/getLocalizedField'
import {
  evaluateAchievementRule,
  getNewlySatisfiedAchievements,
} from '../lib/achievementRules'

const PAGE_LIMIT = 500

const normalizeId = (value) => String(value ?? '').trim()

const listAllRows = async (tableName, mapper, options = {}) => {
  let offset = 0
  let keepGoing = true
  const allRows = []

  while (keepGoing) {
    let query = supabase
      .from(tableName)
      .select('*')

    if (options.publishedOnly) {
      query = query.eq('is_published', true)
    }

    if (options.userId) {
      query = query.eq('user_id', options.userId)
    }

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true })
    }

    const { data, error } = await query.range(offset, offset + PAGE_LIMIT - 1)

    if (error) throw error

    const batch = data ?? []
    allRows.push(...batch.map(mapper).filter(Boolean))
    offset += PAGE_LIMIT
    keepGoing = batch.length === PAGE_LIMIT
  }

  return allRows
}

const buildUnlocksByAchievementId = (userUnlockRows = []) => {
  const unlockedByAchievementId = Object.create(null)

  for (const row of userUnlockRows) {
    const achievementId = normalizeId(row?.achievementId ?? row?.achievement_id)
    if (achievementId) unlockedByAchievementId[achievementId] = row
  }

  return unlockedByAchievementId
}

const buildAchievementsForDisplay = ({
  achievementRows,
  locale,
  siteRows,
  userUnlockRows,
  visitRows,
}) => {
  const unlocksByAchievementId = buildUnlocksByAchievementId(userUnlockRows)

  return (achievementRows ?? [])
    .map((row) => {
      const achievementId = normalizeId(row?.$id ?? row?.id)
      const unlockedAt = unlocksByAchievementId[achievementId]?.unlockedAt || null
      const progress = evaluateAchievementRule(row, {
        locale,
        sites: siteRows,
        visits: visitRows,
      })
      const hasTarget = Number.isFinite(progress.target) && progress.target > 0
      const progressCurrent = unlockedAt && hasTarget
        ? Math.max(progress.current, progress.target)
        : progress.current

      return {
        $id: achievementId,
        badge: row.badge,
        badgePath: row.badgePath,
        criteria: getLocalizedField(row, 'criteria', locale, { defaultValue: row.criteria }),
        description: getLocalizedField(row, 'description', locale, { defaultValue: row.description }),
        isUnlocked: Boolean(unlockedAt),
        name: getLocalizedField(row, 'name', locale, { defaultValue: row.name }),
        progressCurrent,
        progressPercent: unlockedAt ? 100 : progress.progressPercent,
        progressTarget: hasTarget ? progress.target : null,
        ruleConfig: row.ruleConfig,
        ruleType: progress.ruleType,
        unlockedAt,
      }
    })
    .sort((left, right) => String(left?.name || '').localeCompare(String(right?.name || ''), locale))
}

const insertAchievementUnlock = async ({ achievementId, unlockedAt, userId }) => {
  const { data, error } = await supabase
    .from('user_achievements')
    .insert({
      user_id: userId,
      achievement_id: achievementId,
      unlocked_at: unlockedAt,
    })
    .select('*')
    .single()

  if (error?.code === '23505') return { created: false, row: null }
  if (error) throw error

  return { created: true, row: mapUserAchievementRow(data) }
}

const syncAchievementStats = async (userId, achievementsUnlocked) => {
  const updateAchievementCount = async () => {
    const { error } = await supabase
      .from('user_stats')
      .update({ achievements_unlocked: achievementsUnlocked })
      .eq('user_id', userId)

    if (error) throw error
  }

  const { data: existingStats, error: readError } = await supabase
    .from('user_stats')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (readError) throw readError

  if (existingStats) {
    await updateAchievementCount()
    return
  }

  const { error } = await supabase
    .from('user_stats')
    .insert({
      user_id: userId,
      score: 0,
      sites_visited: 0,
      events_attended: 0,
      achievements_unlocked: achievementsUnlocked,
    })

  if (error?.code === '23505') {
    await updateAchievementCount()
    return
  }

  if (error) throw error
}

const captureAchievementUnlocked = (achievement, options = {}) => {
  posthog.capture('achievement_unlocked', {
    achievement_id: achievement?.$id,
    achievement_name: achievement?.name,
    achievement_description: achievement?.description,
    achievement_criteria: achievement?.criteria,
    achievement_rule_type: achievement?.ruleType,
    progress_current: achievement?.progressCurrent,
    progress_target: achievement?.progressTarget,
    source_site_id: options.sourceSiteId,
  })
}

export function useAchievements(userId) {
  const { locale } = useI18n()
  const [achievementRows, setAchievementRows] = useState([])
  const [userUnlockRows, setUserUnlockRows] = useState([])
  const [visitRows, setVisitRows] = useState([])
  const [siteRows, setSiteRows] = useState([])
  const [routeRows, setRouteRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const commitSnapshot = useCallback((snapshot) => {
    setAchievementRows(snapshot.achievementRows)
    setUserUnlockRows(snapshot.userUnlockRows)
    setVisitRows(snapshot.visitRows)
    setSiteRows(snapshot.siteRows)
    setRouteRows(snapshot.routeRows)
  }, [])

  const fetchAchievementSnapshot = useCallback(async (options = {}) => {
    const snapshot = {}

    const [
      nextAchievementRows,
      nextUserUnlockRows,
      nextVisitRows,
      nextSiteRows,
      nextRouteRows,
    ] = await Promise.all([
      listAllRows('achievements', mapAchievementRow, {
        orderBy: 'id',
        publishedOnly: true,
      }),
      userId
        ? listAllRows('user_achievements', mapUserAchievementRow, {
            ascending: false,
            orderBy: 'unlocked_at',
            userId,
          })
        : Promise.resolve([]),
      userId
        ? listAllRows('site_visits', mapSiteVisitRow, {
            ascending: false,
            orderBy: 'created_at',
            userId,
          })
        : Promise.resolve([]),
      listAllRows('heritage_sites', mapHeritageSiteRow, {
        orderBy: 'id',
        publishedOnly: true,
      }),
      listAllRows('routes', mapRouteRow, {
        orderBy: 'id',
        publishedOnly: true,
      }),
    ])

    snapshot.achievementRows = nextAchievementRows
    snapshot.userUnlockRows = nextUserUnlockRows
    snapshot.visitRows = nextVisitRows
    snapshot.siteRows = nextSiteRows
    snapshot.routeRows = nextRouteRows

    if (!options.signal?.aborted && options.commit !== false) {
      commitSnapshot(snapshot)
    }

    return snapshot
  }, [commitSnapshot, userId])

  const fetchAchievements = useCallback(async (options = {}) => {
    const signal = options?.signal

    setLoading(true)
    setError(null)
    try {
      await fetchAchievementSnapshot({ signal })
    } catch (err) {
      if (signal?.aborted) return

      console.error('[useAchievements] fetch error', err)
      setError(err)
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [fetchAchievementSnapshot])

  const unlocksByAchievementId = useMemo(
    () => buildUnlocksByAchievementId(userUnlockRows),
    [userUnlockRows]
  )

  const achievements = useMemo(
    () =>
      buildAchievementsForDisplay({
        achievementRows,
        locale,
        siteRows,
        userUnlockRows,
        visitRows,
      }),
    [achievementRows, locale, siteRows, userUnlockRows, visitRows]
  )

  const isUnlocked = useCallback(
    (achievementId) => Boolean(unlocksByAchievementId[normalizeId(achievementId)]?.unlockedAt),
    [unlocksByAchievementId]
  )

  const unlockAchievement = useCallback(async (achievementId) => {
    if (!userId) throw new Error('unlockAchievement: userId es requerido')
    if (isUnlocked(achievementId)) return null

    const unlockedAt = new Date().toISOString()
    const result = await insertAchievementUnlock({
      achievementId,
      unlockedAt,
      userId,
    })

    const snapshot = await fetchAchievementSnapshot()
    await syncAchievementStats(userId, snapshot.userUnlockRows.length)

    if (!result.created) return null

    const unlockedAchievement = buildAchievementsForDisplay({
      achievementRows: snapshot.achievementRows,
      locale,
      siteRows: snapshot.siteRows,
      userUnlockRows: snapshot.userUnlockRows,
      visitRows: snapshot.visitRows,
    }).find((achievement) => achievement.$id === normalizeId(achievementId))

    captureAchievementUnlocked(unlockedAchievement)
    return unlockedAchievement
  }, [fetchAchievementSnapshot, isUnlocked, locale, userId])

  const evaluateAndUnlockAchievements = useCallback(async (options = {}) => {
    if (!userId) return []

    try {
      const snapshot = await fetchAchievementSnapshot()
      const unlockedAchievementIds = snapshot.userUnlockRows
        .map((row) => normalizeId(row?.achievementId))
        .filter(Boolean)
      const newlySatisfiedRows = getNewlySatisfiedAchievements(snapshot.achievementRows, {
        locale,
        sites: snapshot.siteRows,
        unlockedAchievementIds,
        visits: snapshot.visitRows,
      })
      const newlyCreatedAchievementIds = []

      for (const achievement of newlySatisfiedRows) {
        const achievementId = normalizeId(achievement?.$id)
        if (!achievementId) continue

        const result = await insertAchievementUnlock({
          achievementId,
          unlockedAt: new Date().toISOString(),
          userId,
        })

        if (result.created) newlyCreatedAchievementIds.push(achievementId)
      }

      const nextSnapshot = await fetchAchievementSnapshot()
      await syncAchievementStats(userId, nextSnapshot.userUnlockRows.length)

      if (!newlyCreatedAchievementIds.length) return []

      const newlyCreatedIds = new Set(newlyCreatedAchievementIds)
      const newlyUnlockedAchievements = buildAchievementsForDisplay({
        achievementRows: nextSnapshot.achievementRows,
        locale,
        siteRows: nextSnapshot.siteRows,
        userUnlockRows: nextSnapshot.userUnlockRows,
        visitRows: nextSnapshot.visitRows,
      }).filter((achievement) => newlyCreatedIds.has(achievement.$id))

      for (const achievement of newlyUnlockedAchievements) {
        captureAchievementUnlocked(achievement, { sourceSiteId: options.sourceSiteId })
      }

      return newlyUnlockedAchievements
    } catch (err) {
      console.error('[useAchievements] evaluation error', err)
      setError(err)
      return []
    }
  }, [fetchAchievementSnapshot, locale, userId])

  const refresh = fetchAchievements

  return useMemo(() => ({
    achievements,
    evaluateAndUnlockAchievements,
    error,
    fetchAchievements,
    isUnlocked,
    loading,
    refresh,
    routeRows,
    unlockAchievement,
  }), [
    achievements,
    evaluateAndUnlockAchievements,
    error,
    fetchAchievements,
    isUnlocked,
    loading,
    refresh,
    routeRows,
    unlockAchievement,
  ])
}

export default useAchievements
