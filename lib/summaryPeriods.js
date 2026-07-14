export const SUMMARY_PERIOD_TYPES = Object.freeze({
  ACTIVE_DAY: 'active_day',
  WEEKLY: 'weekly',
})

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export const getDeviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export const formatLocalDateKey = (value = new Date(), timeZone = getDeviceTimeZone()) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      timeZone,
      year: 'numeric',
    }).formatToParts(date)
    const getPart = (type) => parts.find((part) => part.type === type)?.value
    const year = getPart('year')
    const month = getPart('month')
    const day = getPart('day')

    return year && month && day ? `${year}-${month}-${day}` : ''
  } catch {
    return formatLocalDateKey(date, 'UTC')
  }
}

export const addDaysToDateKey = (dateKey, numberOfDays) => {
  if (!DATE_PATTERN.test(String(dateKey || ''))) return ''

  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + Number(numberOfDays || 0)))
  return date.toISOString().slice(0, 10)
}

export const getMondayForDateKey = (dateKey) => {
  if (!DATE_PATTERN.test(String(dateKey || ''))) return ''

  const date = new Date(`${dateKey}T00:00:00.000Z`)
  const day = date.getUTCDay()
  const daysSinceMonday = day === 0 ? 6 : day - 1
  return addDaysToDateKey(dateKey, -daysSinceMonday)
}

export const getPreviousWeekStart = (dateKey) =>
  addDaysToDateKey(getMondayForDateKey(dateKey), -7)

export const isValidNotificationTime = (value) => TIME_PATTERN.test(String(value || ''))

export const normalizeNotificationTime = (value, fallback = '09:00') => {
  const normalized = String(value || '').trim()
  return isValidNotificationTime(normalized) ? normalized : fallback
}

export const getSummaryPeriod = (periodType, startsOn) => ({
  startsOn,
  endsOn: addDaysToDateKey(
    startsOn,
    periodType === SUMMARY_PERIOD_TYPES.WEEKLY ? 7 : 1
  ),
})
