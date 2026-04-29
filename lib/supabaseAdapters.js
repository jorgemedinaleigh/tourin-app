import { supabase } from './supabase'

const CONTENT_BUCKET = 'content'

const isRemoteUrl = (value) => /^https?:\/\//i.test(String(value || ''))

export function getPublicContentUrl(path) {
  if (!path) return null
  if (isRemoteUrl(path)) return path

  const { data } = supabase.storage.from(CONTENT_BUCKET).getPublicUrl(path)
  return data?.publicUrl || null
}

const withAppMeta = (row) => ({
  ...row,
  $id: row?.id,
  $createdAt: row?.created_at,
  $updatedAt: row?.updated_at,
})

export function mapRouteRow(row) {
  if (!row) return null

  return {
    ...withAppMeta(row),
    bestTime: row.best_time,
    timeToComplete: row.time_to_complete,
  }
}

export function mapHeritageSiteRow(row) {
  if (!row) return null

  return {
    ...withAppMeta(row),
    routeId: row.route_id,
    subType: row.sub_type,
    isFree: row.is_free,
    coverPhoto: getPublicContentUrl(row.cover_photo_path),
    coverPhotoPath: row.cover_photo_path,
    stamp: getPublicContentUrl(row.stamp_path),
    stampPath: row.stamp_path,
    legalStatus: row.legal_status,
    stampRadius: row.stamp_radius,
    stopOrder: row.stop_order,
  }
}

export function mapMetroStationRow(row) {
  if (!row) return null

  return {
    ...withAppMeta(row),
    stationName: row.station_name,
    isOperational: row.is_operational,
  }
}

export function mapAchievementRow(row) {
  if (!row) return null

  return {
    ...withAppMeta(row),
    badge: getPublicContentUrl(row.badge_path),
    badgePath: row.badge_path,
  }
}

export function mapSiteVisitRow(row) {
  if (!row) return null

  return {
    ...withAppMeta(row),
    userId: row.user_id,
    siteId: row.site_id,
  }
}

export function mapUserAchievementRow(row) {
  if (!row) return null

  return {
    ...withAppMeta(row),
    userId: row.user_id,
    achievementId: row.achievement_id,
    unlockedAt: row.unlocked_at,
  }
}

export function mapUserStatsRow(row) {
  if (!row) return null

  return {
    ...row,
    $id: row.user_id,
    $createdAt: row.created_at,
    $updatedAt: row.updated_at,
    userId: row.user_id,
    score: typeof row.score === 'number' ? row.score : 0,
    sitesVisited: typeof row.sites_visited === 'number' ? row.sites_visited : 0,
    eventsAttended: typeof row.events_attended === 'number' ? row.events_attended : 0,
    achievementsUnlocked: typeof row.achievements_unlocked === 'number' ? row.achievements_unlocked : 0,
  }
}
