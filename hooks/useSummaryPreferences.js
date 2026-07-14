import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { posthog } from '../lib/posthog'
import {
  getDeviceTimeZone,
  normalizeNotificationTime,
} from '../lib/summaryPeriods'
import {
  applySummaryNotificationPreferences,
  refreshSummaryNotificationSchedules,
} from '../lib/notifications'

const DEFAULT_PREFERENCES = Object.freeze({
  activeDayEnabled: true,
  activeDayTime: '09:00',
  shareLocation: false,
  timezone: 'UTC',
  weeklyEnabled: true,
  weeklyTime: '10:00',
})

const normalizeDatabaseTime = (value, fallback) =>
  normalizeNotificationTime(String(value || '').slice(0, 5), fallback)

const mapPreferences = (row) => ({
  activeDayEnabled: row?.active_day_enabled ?? DEFAULT_PREFERENCES.activeDayEnabled,
  activeDayTime: normalizeDatabaseTime(
    row?.active_day_time,
    DEFAULT_PREFERENCES.activeDayTime
  ),
  shareLocation: row?.share_location ?? DEFAULT_PREFERENCES.shareLocation,
  timezone: row?.timezone || getDeviceTimeZone(),
  weeklyEnabled: row?.weekly_enabled ?? DEFAULT_PREFERENCES.weeklyEnabled,
  weeklyTime: normalizeDatabaseTime(row?.weekly_time, DEFAULT_PREFERENCES.weeklyTime),
})

export function useSummaryPreferences(userId) {
  const [preferences, setPreferences] = useState({
    ...DEFAULT_PREFERENCES,
    timezone: getDeviceTimeZone(),
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadPreferences = useCallback(async () => {
    if (!userId) return null

    setLoading(true)
    setError(null)
    try {
      const { data, error: readError } = await supabase
        .from('summary_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (readError) throw readError

      const nextPreferences = mapPreferences(data)
      setPreferences(nextPreferences)

      if (data && (nextPreferences.activeDayEnabled || nextPreferences.weeklyEnabled)) {
        refreshSummaryNotificationSchedules(userId, nextPreferences).catch(() => {})
      }

      return nextPreferences
    } catch (loadError) {
      console.error('Error loading summary preferences:', loadError)
      setError(loadError)
      return null
    } finally {
      setLoading(false)
    }
  }, [userId])

  const savePreferences = useCallback(async (nextValues) => {
    if (!userId) return null

    setSaving(true)
    setError(null)
    try {
      const nextPreferences = {
        ...preferences,
        ...nextValues,
        activeDayTime: normalizeNotificationTime(nextValues.activeDayTime, '09:00'),
        timezone: getDeviceTimeZone(),
        weeklyTime: normalizeNotificationTime(nextValues.weeklyTime, '10:00'),
      }
      let notificationStatus = 'not_requested'

      const { data, error: saveError } = await supabase
        .from('summary_notification_preferences')
        .upsert({
          user_id: userId,
          active_day_enabled: nextPreferences.activeDayEnabled,
          active_day_time: nextPreferences.activeDayTime,
          weekly_enabled: nextPreferences.weeklyEnabled,
          weekly_time: nextPreferences.weeklyTime,
          timezone: nextPreferences.timezone,
          share_location: nextPreferences.shareLocation,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select('*')
        .single()

      if (saveError) throw saveError

      const normalized = mapPreferences(data)
      setPreferences(normalized)

      try {
        const scheduling = await applySummaryNotificationPreferences(userId, normalized)
        notificationStatus = scheduling.status
      } catch (schedulingError) {
        console.warn('Summary notification scheduling failed:', schedulingError)
        notificationStatus = 'error'
      }

      posthog.capture('summary_preferences_updated', {
        active_day_enabled: normalized.activeDayEnabled,
        weekly_enabled: normalized.weeklyEnabled,
        share_location: normalized.shareLocation,
        notification_permission_status: notificationStatus,
      })

      return { notificationStatus, preferences: normalized }
    } catch (saveError) {
      console.error('Error saving summary preferences:', saveError)
      setError(saveError)
      throw saveError
    } finally {
      setSaving(false)
    }
  }, [preferences, userId])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  return {
    error,
    loadPreferences,
    loading,
    preferences,
    savePreferences,
    saving,
  }
}

export default useSummaryPreferences
