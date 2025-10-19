import { Query } from 'react-native-appwrite'
import { useState } from 'react'
import { tables } from '../lib/appwrite'

const DATABASE_ID = '68b399490018d7cb309b'
const TABLE_ID = 'user_stats'

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function getTop({ sortBy = 'score' } = {}) {
    const allowed = new Set(['score', 'sitesVisited', 'eventsAttended'])
    const field = allowed.has(sortBy) ? sortBy : 'score'

    setLoading(true)
    setError(null)
    try {
      const response = await tables.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        queries: [
          Query.isNotNull(field),
          Query.orderDesc(field), // siempre descendente
          Query.limit(100),
        ],
      })
      const rows = response?.rows ?? []
      setLeaderboard(rows)
      return rows
    } catch (e) {
      console.error('Error fetching stats:', e)
      setLeaderboard([])
      setError(e)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { leaderboard, loading, error, getTop }
}
