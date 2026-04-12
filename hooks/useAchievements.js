import { useCallback, useMemo, useState } from 'react'
import { Query, ID, Permission, Role } from 'react-native-appwrite'
import { tables } from '../lib/appwrite'
import { posthog } from '../lib/posthog'
import { useI18n } from '../contexts/I18nContext'
import getLocalizedField from '../i18n/getLocalizedField'

const DATABASE_ID = '68b399490018d7cb309b'
const ACHIVEMENTS_TABLE_ID  = 'achivements'
const USER_ACHIVEMENTS_TABLE_ID = 'user_achivements'

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
      const achList = await tables.listRows({
        databaseId: DATABASE_ID,
        tableId: ACHIVEMENTS_TABLE_ID,
        queries: [
          Query.limit(200),
          Query.orderAsc('name'),
        ],
      })

      let userUnlocks = { rows: [] }
      if (userId) {
        userUnlocks = await tables.listRows({
          databaseId: DATABASE_ID,
          tableId: USER_ACHIVEMENTS_TABLE_ID,
          queries: [
            Query.equal('userId', [userId]),
            Query.limit(500),
          ],
        })
      }

      if (signal?.aborted) return

      const unlockedByAchId = Object.create(null)
      for (const u of userUnlocks.rows || []) {
        if (u?.achivementId) unlockedByAchId[u.achivementId] = u
      }

      setAchievementRows(achList.rows || [])
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
    const permissions = [Permission.read(Role.user(userId))]

    await tables.createRow({
      databaseId: DATABASE_ID,
      tableId: USER_ACHIVEMENTS_TABLE_ID,
      rowId: ID.unique(),
      data: payload,
      permissions,
    })

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
