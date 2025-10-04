import { useState } from 'react'
import { Query, ID } from 'react-native-appwrite'
import { tables } from '../lib/appwrite'

const DATABASE_ID = '68b399490018d7cb309b'
const VISITS_TABLE_ID  = 'site_visits'
const SITES_TABLE_ID = 'heritage_sites'

export function useSiteVisits(userId, siteId) {
  const [visits, setVisits] = useState(null)

  async function stampVisit(userId, siteId) {
    try {
      const response = await tables.createRow({
        databaseId: DATABASE_ID,
        tableId: VISITS_TABLE_ID,
        rowId: ID.unique(),
        data: { 
          userId: userId, 
          siteId: siteId 
        }
      })
    }catch (error) {
      console.error('Error fetching info:', error)
    }
  }
  
  async function getVisit(userId, siteId) {
    try {
      const response = await tables.listRows({
        databaseId: DATABASE_ID,
        tableId: VISITS_TABLE_ID,
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
      console.error('Error fetching info:', error)
    }
  }

  async function fetchVisits(userId) {
    try {
      const response = await tables.listRows({
        databaseId: DATABASE_ID,
        tableId: VISITS_TABLE_ID,
        queries: [
          Query.equal('userId', [userId])
        ]
      })
      setVisits(response.rows)
    } catch (error) {
      console.error('Error fetching info:', error)
    }
  }

  return { visits, getVisit, fetchVisits, stampVisit}
}