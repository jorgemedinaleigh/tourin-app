import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { mapUserStatsRow } from '../lib/supabaseAdapters'

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function getTop({ sortBy = 'score' } = {}) {
    const fieldMap = {
      score: 'score',
      sitesVisited: 'sites_visited',
      eventsAttended: 'events_attended',
    }
    const field = fieldMap[sortBy] || 'score'

    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .not(field, 'is', null)
        .order(field, { ascending: false })
        .limit(100)

      if (error) throw error

      const rows = (data ?? []).map(mapUserStatsRow).filter(Boolean)
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
