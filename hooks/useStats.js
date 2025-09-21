import { Query, ID } from 'react-native-appwrite'
import { useEffect, useState } from 'react'
import { tables } from '../lib/appwrite'

const DATABASE_ID = '68b399490018d7cb309b'
const TABLE_ID = 'user_stats'

export function useStats(userId) {
  const [stats, setStats] = useState(null)

  async function getStats() {
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
        setStats(response.rows?.[0])
      }
      else {
        const created = await tables.createRow({
          databaseId: DATABASE_ID,
          tableId: TABLE_ID,
          rowId: ID.unique(),
          data: {
            userId: userId
          }
        })
        setStats(created)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats(null)
    }
  }

  async function addPoints(points) {
    try {
      let row = stats ?? (await refresh())

      const newScore = row.score + points

      const updated = await tables.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: row.$id,
        data: {
          score: newScore
        }
      })
      setStats(updated)
    } catch(error) {
      return null
    }
  }

  async function siteVisited() {
    try {
      let row = stats ?? (await refresh())

      const numSitesVisited = row.sitesVisited + 1

      const updated = await tables.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: row.$id,
        data: {
          sitesVisited: numSitesVisited
        }
      })
      setStats(updated)
    } catch(error) {
      return null
    }
  }

  async function eventAttended() {
    try {
      let row = stats ?? (await refresh())

      const numEventsAttended = row.eventsAttended + 1

      const updated = await tables.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: row.$id,
        data: {
          eventsAttended: numEventsAttended
        }
      })
      setStats(updated)
    } catch(error) {
      return null
    }
  }

  useEffect(() => {
    getStats()
  }, [userId])

  return { stats, addPoints, siteVisited, eventAttended }
}