import { useState } from 'react'
import { Query, ID } from 'react-native-appwrite'
import { tables } from '../lib/appwrite'

const DATABASE_ID = '68b399490018d7cb309b'
const VISITS_TABLE_ID  = 'site_visits'
const SITES_TABLE_ID = 'heritage_sites'
const PAGE_LIMIT = 100

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

  // Appwrite pagina los resultados (25 por defecto), por lo que necesitamos recorrer todas las paginas.
  async function listAllRows(tableId, baseQueries = []) {
    let offset = 0
    let keepGoing = true
    const allRows = []

    while (keepGoing) {
      const response = await tables.listRows({
        databaseId: DATABASE_ID,
        tableId,
        queries: [...baseQueries, Query.limit(PAGE_LIMIT), Query.offset(offset)],
      })
      const batch = response?.rows ?? []
      allRows.push(...batch)
      offset += PAGE_LIMIT
      keepGoing = batch.length === PAGE_LIMIT
    }

    return allRows
  }

  async function fetchVisits(userId) {
    if (!userId) {
      setVisits([])
      setSitesVisited([])
      return []
    }
    try {
      const stampedSites = await listAllRows(VISITS_TABLE_ID, [Query.equal('userId', [userId])])
      setVisits(stampedSites)
      const siteIds = [...new Set(stampedSites.map(v => v.siteId).filter(Boolean))]

      if (!siteIds.length) {
        setSitesVisited([])
        return stampedSites
      }

      const fetchedSites = []
      for (let i = 0; i < siteIds.length; i += PAGE_LIMIT) {
        const batchIds = siteIds.slice(i, i + PAGE_LIMIT)
        const sitesResponse = await tables.listRows({
          databaseId: DATABASE_ID,
          tableId: SITES_TABLE_ID,
          queries: [Query.equal('$id', batchIds), Query.limit(PAGE_LIMIT)],
        })
        if (sitesResponse?.rows?.length) {
          fetchedSites.push(...sitesResponse.rows)
        }
      }

      setSitesVisited(fetchedSites)
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
