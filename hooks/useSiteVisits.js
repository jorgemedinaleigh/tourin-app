import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { mapHeritageSiteRow, mapSiteVisitRow } from '../lib/supabaseAdapters'

const PAGE_LIMIT = 100

export function useSiteVisits(userId) {
  const [visits, setVisits] = useState([])
  const [sitesVisited, setSitesVisited] = useState([])

  async function stampVisit(siteId, targetUserId = userId) {
    if (!targetUserId || !siteId) return { created: false, alreadyVisited: false }
    try {
      const { data: createdVisit, error } = await supabase
        .from('site_visits')
        .insert({
          user_id: targetUserId,
          site_id: siteId,
        })
        .select('*')
        .single()

      if (error?.code === '23505') {
        return { created: false, alreadyVisited: true }
      }
      if (error) throw error

      return { created: !!createdVisit, alreadyVisited: false }
    } catch (error) {
      console.error('Error stamping visit:', error)
      return { created: false, alreadyVisited: false }
    }
  }

  async function getVisit(siteId, targetUserId = userId) {
    if (!targetUserId || !siteId) return false
    try {
      const { data, error } = await supabase
        .from('site_visits')
        .select('id')
        .eq('site_id', siteId)
        .eq('user_id', targetUserId)
        .maybeSingle()

      if (error) throw error
      return Boolean(data)
    } catch (error) {
      console.error('Error fetching visit:', error)
      return false
    }
  }

  async function listAllVisits(targetUserId) {
    let offset = 0
    let keepGoing = true
    const allRows = []

    while (keepGoing) {
      const { data, error } = await supabase
        .from('site_visits')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_LIMIT - 1)

      if (error) throw error

      const batch = data ?? []
      allRows.push(...batch.map(mapSiteVisitRow).filter(Boolean))
      offset += PAGE_LIMIT
      keepGoing = batch.length === PAGE_LIMIT
    }

    return allRows
  }

  async function fetchVisits(targetUserId = userId) {
    if (!targetUserId) {
      setVisits([])
      setSitesVisited([])
      return []
    }
    try {
      const stampedSites = await listAllVisits(targetUserId)
      setVisits(stampedSites)
      const siteIds = [...new Set(stampedSites.map((v) => v.siteId).filter(Boolean))]

      if (!siteIds.length) {
        setSitesVisited([])
        return stampedSites
      }

      const fetchedSites = []
      for (let i = 0; i < siteIds.length; i += PAGE_LIMIT) {
        const batchIds = siteIds.slice(i, i + PAGE_LIMIT)
        const { data, error } = await supabase
          .from('heritage_sites')
          .select('*')
          .in('id', batchIds)

        if (error) throw error

        if (data?.length) {
          fetchedSites.push(...data.map(mapHeritageSiteRow).filter(Boolean))
        }
      }

      setSitesVisited(fetchedSites)
      return stampedSites
    } catch (error) {
      console.error('Error fetching visits:', error)
      setVisits([])
      setSitesVisited([])
      return []
    }
  }

  return { visits, sitesVisited, getVisit, fetchVisits, stampVisit }
}
