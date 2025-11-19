import { useState } from 'react'
import { Query, ID } from 'react-native-appwrite'
import { tables } from '../lib/appwrite'

const DATABASE_ID = '68b399490018d7cb309b'
const VISITS_TABLE_ID  = 'site_visits'
const SITES_TABLE_ID = 'heritage_sites'

export function useSiteVisits(userId, siteId) {
  const [visits, setVisits] = useState([])
  const [sitesVisited, setSitesVisited] = useState([])

  async function stampVisit(userId, siteId) {
    if (!userId || !siteId) return null
    try {
      await tables.createRow({
        databaseId: DATABASE_ID,
        tableId: VISITS_TABLE_ID,
        rowId: ID.unique(),
        data: { 
          userId: userId, 
          siteId: siteId 
        }
      })
      return true
    }catch (error) {
      console.error('Error fetching info:', error)
      return null
    }
  }
  
  async function getVisit(userId, siteId) {
    if (!userId || !siteId) return false
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
      return response.total > 0
    } catch (error) {
      console.error('Error fetching info:', error)
      return false
    }
  }

  async function fetchVisits(userId) {
    if (!userId) {
      setVisits([])
      setSitesVisited([])
      return []
    }
    try {
      const response = await tables.listRows({
        databaseId: DATABASE_ID,
        tableId: VISITS_TABLE_ID,
        queries: [
          Query.equal('userId', [userId])
        ]
      })
      const stampedSites = response.rows ?? []
      setVisits(stampedSites)
      const siteIds = stampedSites.map(v => v.siteId).filter(Boolean)

      if (!siteIds.length) {
        setSitesVisited([])
        return stampedSites
      }

      const sitesResponse = await tables.listRows({
        databaseId: DATABASE_ID,
        tableId: SITES_TABLE_ID,
        queries: [
          Query.equal('$id', siteIds)
        ]
      })
      setSitesVisited(sitesResponse.rows ?? [])
      return stampedSites
    } catch (error) {
      console.error('Error fetching info:', error)
      setVisits([])
      setSitesVisited([])
      return []
    }
  }

  return { visits, sitesVisited, getVisit, fetchVisits, stampVisit}
}
