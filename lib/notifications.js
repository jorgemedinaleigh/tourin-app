import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import i18n from '../i18n'
import { supabase } from './supabase'
import {
  addDaysToDateKey,
  formatLocalDateKey,
  getDeviceTimeZone,
  getMondayForDateKey,
  normalizeNotificationTime,
  SUMMARY_PERIOD_TYPES,
} from './summaryPeriods'

const SUMMARY_NOTIFICATION_STORAGE_PREFIX = 'tourin.summaryNotifications'
const SUMMARY_CHANNEL_ID = 'exploration-summaries'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

const getStorageKey = (userId) => `${SUMMARY_NOTIFICATION_STORAGE_PREFIX}.${userId}`

const readScheduledRecords = async (userId) => {
  if (!userId) return []

  try {
    const value = await AsyncStorage.getItem(getStorageKey(userId))
    const records = value ? JSON.parse(value) : []
    return Array.isArray(records) ? records : []
  } catch {
    return []
  }
}

const writeScheduledRecords = async (userId, records) => {
  if (!userId) return
  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(records))
}

const mapPreferences = (row) => ({
  activeDayEnabled: row?.active_day_enabled ?? true,
  activeDayTime: normalizeNotificationTime(String(row?.active_day_time || '').slice(0, 5), '09:00'),
  weeklyEnabled: row?.weekly_enabled ?? true,
  weeklyTime: normalizeNotificationTime(String(row?.weekly_time || '').slice(0, 5), '10:00'),
})

const getDeliveryDate = (periodType, startsOn, preferences) => {
  const deliveryDateKey = addDaysToDateKey(
    startsOn,
    periodType === SUMMARY_PERIOD_TYPES.WEEKLY ? 7 : 1
  )
  const deliveryTime = periodType === SUMMARY_PERIOD_TYPES.WEEKLY
    ? preferences.weeklyTime
    : preferences.activeDayTime
  const [year, month, day] = deliveryDateKey.split('-').map(Number)
  const [hour, minute] = deliveryTime.split(':').map(Number)

  return new Date(year, month - 1, day, hour, minute, 0, 0)
}

const getNotificationCopy = (periodType) => {
  const prefix = periodType === SUMMARY_PERIOD_TYPES.WEEKLY
    ? 'summaries:notifications.weekly'
    : 'summaries:notifications.activeDay'

  return {
    body: i18n.t(`${prefix}.body`),
    title: i18n.t(`${prefix}.title`),
  }
}

const isPeriodEnabled = (periodType, preferences) =>
  periodType === SUMMARY_PERIOD_TYPES.WEEKLY
    ? preferences.weeklyEnabled
    : preferences.activeDayEnabled

export const configureSummaryNotificationChannel = async () => {
  if (Platform.OS !== 'android') return

  await Notifications.setNotificationChannelAsync(SUMMARY_CHANNEL_ID, {
    importance: Notifications.AndroidImportance.DEFAULT,
    name: i18n.t('summaries:preferences.channelName'),
    sound: 'default',
  })
}

export const getSummaryNotificationPermission = async () => {
  if (Platform.OS === 'web') return 'unavailable'

  const permissions = await Notifications.getPermissionsAsync()
  return permissions.status
}

export const requestSummaryNotificationPermission = async (requestPermission = true) => {
  if (Platform.OS === 'web') return 'unavailable'

  await configureSummaryNotificationChannel()
  let permissions = await Notifications.getPermissionsAsync()

  if (permissions.status !== 'granted' && requestPermission) {
    permissions = await Notifications.requestPermissionsAsync()
  }

  return permissions.status
}

const cancelRecord = async (record) => {
  if (!record?.notificationId) return
  await Notifications.cancelScheduledNotificationAsync(record.notificationId).catch(() => {})
}

const scheduleRecord = async ({ periodType, startsOn }, preferences) => {
  const deliveryDate = getDeliveryDate(periodType, startsOn, preferences)
  if (deliveryDate.getTime() <= Date.now()) return null

  const copy = getNotificationCopy(periodType)
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      body: copy.body,
      data: { periodType, startsOn },
      sound: 'default',
      title: copy.title,
    },
    trigger: {
      channelId: SUMMARY_CHANNEL_ID,
      date: deliveryDate,
      type: Notifications.SchedulableTriggerInputTypes.DATE,
    },
  })

  return {
    deliveryAt: deliveryDate.toISOString(),
    notificationId,
    periodType,
    startsOn,
  }
}

const syncScheduledRecords = async (userId, preferences, additionalPeriods = []) => {
  const existingRecords = await readScheduledRecords(userId)
  const periodsByKey = new Map()

  for (const record of existingRecords) {
    const deliveryTime = new Date(record?.deliveryAt).getTime()
    if (
      Number.isFinite(deliveryTime) &&
      deliveryTime > Date.now() &&
      isPeriodEnabled(record.periodType, preferences)
    ) {
      periodsByKey.set(`${record.periodType}:${record.startsOn}`, {
        periodType: record.periodType,
        startsOn: record.startsOn,
      })
    }
  }

  for (const period of additionalPeriods) {
    if (isPeriodEnabled(period.periodType, preferences)) {
      periodsByKey.set(`${period.periodType}:${period.startsOn}`, period)
    }
  }

  await Promise.all(existingRecords.map(cancelRecord))

  const nextRecords = []
  for (const period of periodsByKey.values()) {
    const record = await scheduleRecord(period, preferences)
    if (record) nextRecords.push(record)
  }

  await writeScheduledRecords(userId, nextRecords)
  return nextRecords
}

const getCurrentActivityPeriods = async (userId) => {
  const timezone = getDeviceTimeZone()
  const today = formatLocalDateKey(new Date(), timezone)
  const weekStartsOn = getMondayForDateKey(today)
  const [visitsResult, achievementsResult] = await Promise.all([
    supabase
      .from('site_visits')
      .select('activity_local_date')
      .eq('user_id', userId)
      .gte('activity_local_date', weekStartsOn)
      .lte('activity_local_date', today),
    supabase
      .from('user_achievements')
      .select('activity_local_date')
      .eq('user_id', userId)
      .gte('activity_local_date', weekStartsOn)
      .lte('activity_local_date', today),
  ])

  if (visitsResult.error) throw visitsResult.error
  if (achievementsResult.error) throw achievementsResult.error

  const activityDates = [
    ...(visitsResult.data || []),
    ...(achievementsResult.data || []),
  ].map((row) => row.activity_local_date)
  const periods = []

  if (activityDates.includes(today)) {
    periods.push({
      periodType: SUMMARY_PERIOD_TYPES.ACTIVE_DAY,
      startsOn: today,
    })
  }
  if (activityDates.length) {
    periods.push({
      periodType: SUMMARY_PERIOD_TYPES.WEEKLY,
      startsOn: weekStartsOn,
    })
  }

  return periods
}

export const applySummaryNotificationPreferences = async (userId, preferences) => {
  if (!userId) return { records: [], status: 'unavailable' }

  if (!preferences.activeDayEnabled && !preferences.weeklyEnabled) {
    await cancelSummaryNotifications(userId)
    return { records: [], status: 'disabled' }
  }

  const status = await requestSummaryNotificationPermission(true)
  if (status !== 'granted') return { records: [], status }

  const currentPeriods = await getCurrentActivityPeriods(userId)
  const records = await syncScheduledRecords(userId, preferences, currentPeriods)
  return { records, status }
}

export const scheduleSummaryNotificationsAfterActivity = async (userId) => {
  if (!userId || Platform.OS === 'web') return { records: [], status: 'unavailable' }

  const { data, error } = await supabase
    .from('summary_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return { records: [], status: 'not_configured' }

  const status = await requestSummaryNotificationPermission(false)
  if (status !== 'granted') return { records: [], status }

  const preferences = mapPreferences(data)
  const today = formatLocalDateKey()
  const additionalPeriods = []

  if (preferences.activeDayEnabled) {
    additionalPeriods.push({
      periodType: SUMMARY_PERIOD_TYPES.ACTIVE_DAY,
      startsOn: today,
    })
  }
  if (preferences.weeklyEnabled) {
    additionalPeriods.push({
      periodType: SUMMARY_PERIOD_TYPES.WEEKLY,
      startsOn: getMondayForDateKey(today),
    })
  }

  const records = await syncScheduledRecords(userId, preferences, additionalPeriods)
  return { records, status }
}

export const refreshSummaryNotificationSchedules = async (userId, preferences) => {
  if (!userId || Platform.OS === 'web') return

  const status = await requestSummaryNotificationPermission(false)
  if (status !== 'granted') return

  const currentPeriods = await getCurrentActivityPeriods(userId)
  await syncScheduledRecords(userId, preferences, currentPeriods)
}

export const cancelSummaryNotifications = async (userId) => {
  if (!userId || Platform.OS === 'web') return

  const records = await readScheduledRecords(userId)
  await Promise.all(records.map(cancelRecord))
  await AsyncStorage.removeItem(getStorageKey(userId))
}

export const getSummaryTargetFromNotification = (response) => {
  const data = response?.notification?.request?.content?.data
  const summaryId = typeof data?.summaryId === 'string' ? data.summaryId : null
  const periodType = Object.values(SUMMARY_PERIOD_TYPES).includes(data?.periodType)
    ? data.periodType
    : null
  const startsOn = typeof data?.startsOn === 'string' ? data.startsOn : null

  if (!summaryId && (!periodType || !startsOn)) return null
  return { periodType, startsOn, summaryId }
}

export { Notifications }
