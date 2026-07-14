import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addDaysToDateKey,
  formatLocalDateKey,
  getMondayForDateKey,
  getPreviousWeekStart,
  normalizeNotificationTime,
} from './summaryPeriods.js'

test('finds Monday and previous Monday across month boundaries', () => {
  assert.equal(getMondayForDateKey('2026-07-19'), '2026-07-13')
  assert.equal(getMondayForDateKey('2026-07-20'), '2026-07-20')
  assert.equal(getPreviousWeekStart('2026-08-02'), '2026-07-20')
})

test('adds days across leap days and year boundaries', () => {
  assert.equal(addDaysToDateKey('2028-02-28', 1), '2028-02-29')
  assert.equal(addDaysToDateKey('2026-12-31', 1), '2027-01-01')
})

test('formats an instant using the requested time zone', () => {
  const instant = new Date('2026-07-20T02:30:00.000Z')
  assert.equal(formatLocalDateKey(instant, 'America/Santiago'), '2026-07-19')
  assert.equal(formatLocalDateKey(instant, 'UTC'), '2026-07-20')
})

test('normalizes configurable notification times', () => {
  assert.equal(normalizeNotificationTime('08:45'), '08:45')
  assert.equal(normalizeNotificationTime('25:00', '10:00'), '10:00')
})
