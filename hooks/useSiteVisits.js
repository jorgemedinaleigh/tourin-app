import { useState } from 'react'
import { Query, ID } from 'react-native-appwrite'
import { tables } from '../lib/appwrite'
import { backendMode, fetchPassport, stampSiteVisit } from '../lib/backend'

const DATABASE_ID = '68b399490018d7cb309b'
const VISITS_TABLE_ID  = 'site_visits'
const SITES_TABLE_ID = 'heritage_sites'
const PAGE_LIMIT = 100

export function useSiteVisits(userId, siteId) {
  const [visits, setVisits] = useState([])
  const [sitesVisited, setSitesVisited] = useState([])

  function mapPassportEntries(entries = []) {
    const mappedVisits = entries.map((entry) => ({
      $id: entry.visitId,
      siteId: entry.siteId,
      $createdAt: entry.capturedAt,
    }))

    const mappedSites = entries.map((entry) => ({
      $id: entry.siteId,
      name: entry.siteName,
      stamp: entry.stampUrl,
      coverPhoto: entry.coverPhotoUrl,
    }))

    return { mappedVisits, mappedSites }
  }

  async function stampVisit(userIdOrPayload, siteId) {
    const payload = typeof userIdOrPayload === 'object' && userIdOrPayload !== null
      ? userIdOrPayload
      : { userId: userIdOrPayload, siteId }

    if (!payload?.siteId) return null

    if (backendMode === 'aws') {
      try {
        return await stampSiteVisit({
          siteId: payload.siteId,
          latitude: payload.latitude ?? null,
          longitude: payload.longitude ?? null,
          capturedAt: payload.capturedAt ?? new Date().toISOString(),
        })
      } catch (error) {
        console.error('Error stamping AWS visit:', error)
        return null
      }
    }

    const resolvedUserId = payload.userId ?? userId
    if (!resolvedUserId) return null

    try {
      await tables.createRow({
        databaseId: DATABASE_ID,
        tableId: VISITS_TABLE_ID,
        rowId: ID.unique(),
        data: { 
          userId: resolvedUserId, 
          siteId: payload.siteId 
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

    if (backendMode === 'aws') {
      const cached = visits.some((visit) => visit.siteId === siteId)
      if (cached) {
        return true
      }

      try {
        const response = await fetchPassport(siteId)
        return (response?.visits?.length ?? 0) > 0
      } catch (error) {
        console.error('Error fetching AWS visit info:', error)
        return false
      }
    }

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

    if (backendMode === 'aws') {
      try {
        const response = await fetchPassport()
        const entries = response?.visits ?? []
        const { mappedVisits, mappedSites } = mapPassportEntries(entries)
        setVisits(mappedVisits)
        setSitesVisited(mappedSites)
        return mappedVisits
      } catch (error) {
        console.error('Error fetching AWS passport:', error)
        setVisits([])
        setSitesVisited([])
        return []
      }
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
