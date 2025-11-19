import { Query, ID } from 'react-native-appwrite'
import { useEffect, useState } from 'react'
import { tables } from '../lib/appwrite'

const DATABASE_ID = '68b399490018d7cb309b'
const TABLE_ID = 'user_stats'

function normalizeRow(row) {
  if (!row) return null
  return {
    ...row,
    score: typeof row.score === 'number' ? row.score : 0,
    sitesVisited: typeof row.sitesVisited === 'number' ? row.sitesVisited : 0,
    eventsAttended: typeof row.eventsAttended === 'number' ? row.eventsAttended : 0,
  }
}

export function useStats(userId) {
  const [stats, setStats] = useState(null)

  async function getStats() {
    if (!userId) {
      setStats(null)
      return null
    }
    try {
      const response = await tables.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        queries: [
          Query.equal('userId', [userId]),
          Query.limit(1),
        ],
      })
      if(response.total > 0)
      {
        const row = normalizeRow(response.rows?.[0])
        setStats(row)
        return row
      }
      else {
        const created = await tables.createRow({
          databaseId: DATABASE_ID,
          tableId: TABLE_ID,
          rowId: ID.unique(),
          data: {
            userId: userId,
            score: 0,
            sitesVisited: 0,
            eventsAttended: 0,
          }
        })
        const normalized = normalizeRow(created)
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

      const updated = await tables.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: row.$id,
        data: {
          score: newScore
        }
      })
      const normalized = normalizeRow(updated)
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

      const updated = await tables.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: row.$id,
        data: {
          sitesVisited: numSitesVisited
        }
      })
      const normalized = normalizeRow(updated)
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

      const updated = await tables.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: row.$id,
        data: {
          eventsAttended: numEventsAttended
        }
      })
      const normalized = normalizeRow(updated)
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
