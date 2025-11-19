import { useCallback, useMemo, useRef, useState } from 'react'
import { Query, ID, Permission, Role } from 'react-native-appwrite'
import { tables } from '../lib/appwrite'

const DATABASE_ID = '68b399490018d7cb309b'
const ACHIVEMENTS_TABLE_ID  = 'achivements'
const USER_ACHIVEMENTS_TABLE_ID = 'user_achivements'

export function useAchievements(userId) {
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const alive = useRef(true)
  const setSafe = useCallback((fn) => { if (alive.current) fn() }, [])

  const fetchAchievements = useCallback(async () => {
    setSafe(() => { setLoading(true); setError(null) })
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

      const unlockedByAchId = Object.create(null)
      for (const u of userUnlocks.rows || []) {
        if (u?.achivementId) unlockedByAchId[u.achivementId] = u
      }

      const merged = (achList.rows || []).map((row) => ({
        $id: row.$id,
        name: row.name,
        description: row.description,
        criteria: row.criteria,
        badge: row.badge,
        unlockedAt: unlockedByAchId[row.$id]?.unlockedAt || null,
      }))

      setSafe(() => setAchievements(merged))
    } catch (err) {
      console.error('[useAchievements] fetch error', err)
      setSafe(() => setError(err))
    } finally {
      setSafe(() => setLoading(false))
    }
  }, [userId])

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

    // Optimistic update
    setAchievements((prev) => prev.map((a) => (a.$id === achievementId ? { ...a, unlockedAt: payload.unlockedAt } : a)))
  }, [userId, isUnlocked])

  const refresh = fetchAchievements
  const stop = useCallback(() => { alive.current = false }, [])

  return useMemo(() => ({
    achievements, loading, error, fetchAchievements, refresh, isUnlocked, unlockAchievement, stop
  }), [achievements, loading, error, fetchAchievements, refresh, isUnlocked, unlockAchievement, stop])
}

export default useAchievements
