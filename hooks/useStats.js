import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { mapUserStatsRow } from '../lib/supabaseAdapters'

export function useStats(userId) {
  const [stats, setStats] = useState(null)

  async function getStats() {
    if (!userId) {
      setStats(null)
      return null
    }
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error

      if(data)
      {
        const row = mapUserStatsRow(data)
        setStats(row)
        return row
      }
      else {
        const { data: created, error: createError } = await supabase
          .from('user_stats')
          .insert({
            user_id: userId,
            score: 0,
            sites_visited: 0,
            events_attended: 0,
            achievements_unlocked: 0,
          })
          .select('*')
          .single()

        if (createError) throw createError

        const normalized = mapUserStatsRow(created)
        setStats(normalized)
        return normalized
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats(null)
      return null
    }
  }

  async function addPoints(points) {
    if (!userId) return null
    try {
      const row = stats ?? (await getStats())
      if (!row) return null

      const increment = Number(points) || 0
      const newScore = row.score + increment

      const { data: updated, error } = await supabase
        .from('user_stats')
        .update({
          score: newScore
        })
        .eq('user_id', userId)
        .select('*')
        .single()

      if (error) throw error

      const normalized = mapUserStatsRow(updated)
      setStats(normalized)
      return normalized
    } catch(error) {
      return null
    }
  }

  async function siteVisited() {
    if (!userId) return null
    try {
      const row = stats ?? (await getStats())
      if (!row) return null

      const numSitesVisited = row.sitesVisited + 1

      const { data: updated, error } = await supabase
        .from('user_stats')
        .update({
          sites_visited: numSitesVisited
        })
        .eq('user_id', userId)
        .select('*')
        .single()

      if (error) throw error

      const normalized = mapUserStatsRow(updated)
      setStats(normalized)
      return normalized
    } catch(error) {
      return null
    }
  }

  async function eventAttended() {
    if (!userId) return null
    try {
      const row = stats ?? (await getStats())
      if (!row) return null

      const numEventsAttended = row.eventsAttended + 1

      const { data: updated, error } = await supabase
        .from('user_stats')
        .update({
          events_attended: numEventsAttended
        })
        .eq('user_id', userId)
        .select('*')
        .single()

      if (error) throw error

      const normalized = mapUserStatsRow(updated)
      setStats(normalized)
      return normalized
    } catch(error) {
      return null
    }
  }

  useEffect(() => {
    if (userId) {
      getStats()
    } else {
      setStats(null)
    }
  }, [userId])

  return { stats, getStats, addPoints, siteVisited, eventAttended }
}
