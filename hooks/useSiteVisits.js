import { useState } from 'react'
import { Query, ID } from 'react-native-appwrite'
import { tables } from '../lib/appwrite'

const DATABASE_ID = '68b399490018d7cb309b'
const TABLE_ID = 'site_visits'

export function useSiteVisits(userId, siteId) {
  const [visits, setVisits] = useState(null)

  async function getVisit(userId, siteId) {
    try {
      const response = await tables.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        queries: [
          Query.equal('siteId', [siteId]),
          Query.equal('userId', [userId]),
          Query.limit(1),
        ],
      })
      if(response.total > 0) {
        return true
      }
      else {
        return false
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  return { visits, getVisit }
}