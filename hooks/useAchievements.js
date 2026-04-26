import { useCallback, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { mapAchievementRow, mapUserAchievementRow } from '../lib/supabaseAdapters'
import { posthog } from '../lib/posthog'
import { useI18n } from '../contexts/I18nContext'
import getLocalizedField from '../i18n/getLocalizedField'

export function useAchievements(userId) {
  const { locale } = useI18n()
  const [achievementRows, setAchievementRows] = useState([])
  const [unlocksByAchievementId, setUnlocksByAchievementId] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAchievements = useCallback(async (options) => {
    const signal = options?.signal
    
    setLoading(true); setError(null)
    try {
      const { data: achievementRows, error: achievementError } = await supabase
        .from('achievements')
        .select('*')
        .limit(200)

      if (achievementError) throw achievementError

      let userUnlockRows = []
      if (userId) {
        const { data, error } = await supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', userId)
          .limit(500)

        if (error) throw error
        userUnlockRows = data ?? []
      }

      if (signal?.aborted) return

      const unlockedByAchId = Object.create(null)
      for (const row of userUnlockRows) {
        const u = mapUserAchievementRow(row)
        if (u?.achivementId) unlockedByAchId[u.achivementId] = u
      }

      setAchievementRows((achievementRows || []).map(mapAchievementRow).filter(Boolean))
      setUnlocksByAchievementId(unlockedByAchId)
    } catch (err) {
      if (signal?.aborted) return

      console.error('[useAchievements] fetch error', err)
      setError(err)
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [userId])

  const achievements = useMemo(
    () =>
      achievementRows
        .map((row) => ({
          $id: row.$id,
          badge: row.badge,
          criteria: getLocalizedField(row, 'criteria', locale, { defaultValue: row.criteria }),
          description: getLocalizedField(row, 'description', locale, { defaultValue: row.description }),
          name: getLocalizedField(row, 'name', locale, { defaultValue: row.name }),
          unlockedAt: unlocksByAchievementId[row.$id]?.unlockedAt || null,
        }))
        .sort((left, right) => String(left?.name || '').localeCompare(String(right?.name || ''), locale)),
    [achievementRows, unlocksByAchievementId, locale]
  )

  const isUnlocked = useCallback(
    (achievementId) => Boolean(achievements.find((a) => a.$id === achievementId)?.unlockedAt),
    [achievements]
  )

  const unlockAchievement = useCallback(async (achievementId) => {
    if (!userId) throw new Error('unlockAchievement: userId es requerido')
    if (isUnlocked(achievementId)) return

    const payload = { userId, achivementId: achievementId, unlockedAt: new Date().toISOString() }

    const { error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: payload.unlockedAt,
      })

    if (error?.code === '23505') return
    if (error) throw error

    // Get achievement details for tracking
    const achievement = achievements.find((a) => a.$id === achievementId)

    // Track achievement unlocked event - key engagement event
    posthog.capture('achievement_unlocked', {
      achievement_id: achievementId,
      achievement_name: achievement?.name,
      achievement_description: achievement?.description,
      achievement_criteria: achievement?.criteria,
    })

    // Optimistic update
    setUnlocksByAchievementId((prev) => ({
      ...prev,
      [achievementId]: {
        ...(prev[achievementId] || {}),
        unlockedAt: payload.unlockedAt,
      },
    }))
  }, [userId, isUnlocked, achievements])

  const refresh = fetchAchievements

  return useMemo(() => ({
    achievements, loading, error, fetchAchievements, refresh, isUnlocked, unlockAchievement
  }), [achievements, loading, error, fetchAchievements, refresh, isUnlocked, unlockAchievement])
}

export default useAchievements
