import { describe, it, expect } from 'vitest'
import {
  parseDbDate,
  lastOccurrenceDayOfMonth,
  lastOccurrenceDayOfWeek,
} from '../../electron/database/tagRules'

// All timestamps in MailShelf are stored and reasoned about in UTC.
// These tests pin that contract so a future refactor can't silently
// reintroduce local-time parsing bugs.

describe('parseDbDate', () => {
  it('treats SQLite "YYYY-MM-DD HH:MM:SS" (no tz) as UTC', () => {
    const d = parseDbDate('2025-01-01 07:00:00')
    expect(d.toISOString()).toBe('2025-01-01T07:00:00.000Z')
  })

  it('parses an ISO string with Z as-is', () => {
    const d = parseDbDate('2025-06-15T12:34:56.000Z')
    expect(d.toISOString()).toBe('2025-06-15T12:34:56.000Z')
  })

  it('parses an ISO string with a +HH:MM offset as-is', () => {
    const d = parseDbDate('2025-06-15T12:00:00+02:00')
    expect(d.toISOString()).toBe('2025-06-15T10:00:00.000Z')
  })

  it('round-trips a value produced by Date#toISOString', () => {
    const iso = new Date('2025-03-10T08:09:10.000Z').toISOString()
    expect(parseDbDate(iso).toISOString()).toBe(iso)
  })
})

describe('lastOccurrenceDayOfMonth', () => {
  it('returns today at UTC midnight when today IS the target day', () => {
    const now = new Date('2025-05-15T18:00:00Z')
    expect(lastOccurrenceDayOfMonth(now, 15).toISOString()).toBe('2025-05-15T00:00:00.000Z')
  })

  it('returns this month when the target day already passed', () => {
    const now = new Date('2025-05-15T18:00:00Z')
    expect(lastOccurrenceDayOfMonth(now, 1).toISOString()).toBe('2025-05-01T00:00:00.000Z')
  })

  it('reaches back into the previous month when the target day is still ahead', () => {
    const now = new Date('2025-05-01T06:00:00Z')
    expect(lastOccurrenceDayOfMonth(now, 20).toISOString()).toBe('2025-04-20T00:00:00.000Z')
  })

  it('wraps from January back into the previous December', () => {
    const now = new Date('2025-01-05T00:00:00Z')
    expect(lastOccurrenceDayOfMonth(now, 28).toISOString()).toBe('2024-12-28T00:00:00.000Z')
  })

  it('clamps the target day to the previous month length (day 31 -> Feb)', () => {
    // Target day 31, but previous month (February 2025) only has 28 days.
    const now = new Date('2025-03-10T00:00:00Z')
    expect(lastOccurrenceDayOfMonth(now, 31).toISOString()).toBe('2025-02-28T00:00:00.000Z')
  })

  it('ignores the time-of-day component of now (always lands on midnight)', () => {
    const now = new Date('2025-07-09T23:59:59Z')
    const result = lastOccurrenceDayOfMonth(now, 9)
    expect(result.getUTCHours()).toBe(0)
    expect(result.getUTCMinutes()).toBe(0)
    expect(result.getUTCSeconds()).toBe(0)
  })
})

describe('lastOccurrenceDayOfWeek', () => {
  // 2025-05-15 is a Thursday (UTC day-of-week = 4).
  it('returns today at UTC midnight when today IS the target weekday', () => {
    const now = new Date('2025-05-15T18:00:00Z') // Thursday
    expect(lastOccurrenceDayOfWeek(now, 4).toISOString()).toBe('2025-05-15T00:00:00.000Z')
  })

  it('reaches back to earlier this week for a weekday already passed', () => {
    const now = new Date('2025-05-15T18:00:00Z') // Thursday
    // Monday = 1, three days back
    expect(lastOccurrenceDayOfWeek(now, 1).toISOString()).toBe('2025-05-12T00:00:00.000Z')
  })

  it('reaches back into the previous week for a weekday still ahead', () => {
    const now = new Date('2025-05-15T18:00:00Z') // Thursday
    // Saturday = 6, which is ahead this week -> last Saturday
    expect(lastOccurrenceDayOfWeek(now, 6).toISOString()).toBe('2025-05-10T00:00:00.000Z')
  })

  it('handles Sunday (0) correctly as a target', () => {
    const now = new Date('2025-05-15T18:00:00Z') // Thursday
    expect(lastOccurrenceDayOfWeek(now, 0).toISOString()).toBe('2025-05-11T00:00:00.000Z')
  })
})
