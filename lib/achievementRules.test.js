import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ACHIEVEMENT_RULE_TYPES,
  evaluateAchievementRule,
  getNewlySatisfiedAchievements,
} from './achievementRules'

const site = (overrides) => ({
  id: overrides.id,
  is_published: true,
  ...overrides,
})

const achievement = (overrides) => ({
  id: overrides.id ?? 'achievement-1',
  rule_type: overrides.rule_type,
  rule_config: overrides.rule_config ?? {},
})

test('route_completed unlocks when every published route site is stamped', () => {
  const result = evaluateAchievementRule(
    achievement({
      rule_type: ACHIEVEMENT_RULE_TYPES.ROUTE_COMPLETED,
      rule_config: { routeId: 'route-1' },
    }),
    {
      sites: [
        site({ id: 'site-1', route_id: 'route-1' }),
        site({ id: 'site-2', route_id: 'route-1' }),
        site({ id: 'site-3', route_id: 'route-2' }),
        site({ id: 'draft-site', is_published: false, route_id: 'route-1' }),
      ],
      visits: [
        { site_id: 'site-1' },
        { site_id: 'site-1' },
        { site_id: 'site-2' },
        { site_id: 'site-3' },
      ],
    }
  )

  assert.equal(result.current, 2)
  assert.equal(result.target, 2)
  assert.equal(result.progressPercent, 100)
  assert.equal(result.isSatisfied, true)
})

test('route_completed stays locked for incomplete routes', () => {
  const result = evaluateAchievementRule(
    achievement({
      rule_type: ACHIEVEMENT_RULE_TYPES.ROUTE_COMPLETED,
      rule_config: { routeId: 'route-1' },
    }),
    {
      sites: [
        site({ id: 'site-1', route_id: 'route-1' }),
        site({ id: 'site-2', route_id: 'route-1' }),
      ],
      visits: [{ site_id: 'site-1' }],
    }
  )

  assert.equal(result.current, 1)
  assert.equal(result.target, 2)
  assert.equal(result.progressPercent, 50)
  assert.equal(result.isSatisfied, false)
})

test('route_completed does not unlock empty routes', () => {
  const result = evaluateAchievementRule(
    achievement({
      rule_type: ACHIEVEMENT_RULE_TYPES.ROUTE_COMPLETED,
      rule_config: { routeId: 'missing-route' },
    }),
    {
      sites: [site({ id: 'site-1', route_id: 'route-1' })],
      visits: [{ site_id: 'site-1' }],
    }
  )

  assert.equal(result.current, 0)
  assert.equal(result.target, 0)
  assert.equal(result.progressPercent, 0)
  assert.equal(result.isSatisfied, false)
})

test('site_count_by_attribute unlocks when matching stamped sites reach the target', () => {
  const result = evaluateAchievementRule(
    achievement({
      rule_type: ACHIEVEMENT_RULE_TYPES.SITE_COUNT_BY_ATTRIBUTE,
      rule_config: {
        siteField: 'sub_type',
        siteValues: ['museum'],
        target: 2,
      },
    }),
    {
      locale: 'en',
      sites: [
        site({ id: 'site-1', sub_type: { en: 'Museum', es: 'Museo' } }),
        site({ id: 'site-2', sub_type: 'museum' }),
        site({ id: 'site-3', sub_type: 'monument' }),
      ],
      visits: [
        { site_id: 'site-1' },
        { site_id: 'site-2' },
        { site_id: 'site-2' },
        { site_id: 'site-3' },
      ],
    }
  )

  assert.equal(result.current, 2)
  assert.equal(result.target, 2)
  assert.equal(result.progressPercent, 100)
  assert.equal(result.isSatisfied, true)
})

test('site_count_by_attribute tracks partial progress below threshold', () => {
  const result = evaluateAchievementRule(
    achievement({
      rule_type: ACHIEVEMENT_RULE_TYPES.SITE_COUNT_BY_ATTRIBUTE,
      rule_config: {
        siteField: 'region',
        siteValues: ['metropolitana'],
        target: 3,
      },
    }),
    {
      sites: [
        site({ id: 'site-1', region: 'Metropolitana' }),
        site({ id: 'site-2', region: 'Valparaiso' }),
        site({ id: 'site-3', region: 'Metropolitana' }),
      ],
      visits: [{ site_id: 'site-1' }, { site_id: 'site-3' }],
    }
  )

  assert.equal(result.current, 2)
  assert.equal(result.target, 3)
  assert.equal(result.progressPercent, 67)
  assert.equal(result.isSatisfied, false)
})

test('site_count_by_attribute supports boolean fields', () => {
  const result = evaluateAchievementRule(
    achievement({
      rule_type: ACHIEVEMENT_RULE_TYPES.SITE_COUNT_BY_ATTRIBUTE,
      rule_config: {
        siteField: 'is_free',
        siteValues: [true],
        target: 1,
      },
    }),
    {
      sites: [
        site({ id: 'site-1', is_free: true }),
        site({ id: 'site-2', is_free: false }),
      ],
      visits: [{ site_id: 'site-1' }, { site_id: 'site-2' }],
    }
  )

  assert.equal(result.current, 1)
  assert.equal(result.target, 1)
  assert.equal(result.isSatisfied, true)
})

test('manual and unknown achievement rules never auto-unlock', () => {
  const manual = evaluateAchievementRule(
    achievement({ rule_type: ACHIEVEMENT_RULE_TYPES.MANUAL }),
    { sites: [site({ id: 'site-1' })], visits: [{ site_id: 'site-1' }] }
  )
  const unknown = evaluateAchievementRule(
    achievement({ rule_type: 'future_rule_kind' }),
    { sites: [site({ id: 'site-1' })], visits: [{ site_id: 'site-1' }] }
  )

  assert.equal(manual.isSatisfied, false)
  assert.equal(manual.target, null)
  assert.equal(unknown.isSatisfied, false)
  assert.equal(unknown.ruleType, ACHIEVEMENT_RULE_TYPES.MANUAL)
})

test('getNewlySatisfiedAchievements excludes already-unlocked achievements', () => {
  const achievements = [
    achievement({
      id: 'already-unlocked',
      rule_type: ACHIEVEMENT_RULE_TYPES.SITE_COUNT_BY_ATTRIBUTE,
      rule_config: { siteField: 'route_id', siteValues: ['route-1'], target: 1 },
    }),
    achievement({
      id: 'new-unlock',
      rule_type: ACHIEVEMENT_RULE_TYPES.SITE_COUNT_BY_ATTRIBUTE,
      rule_config: { siteField: 'route_id', siteValues: ['route-1'], target: 1 },
    }),
  ]

  const newlySatisfied = getNewlySatisfiedAchievements(achievements, {
    sites: [site({ id: 'site-1', route_id: 'route-1' })],
    visits: [{ site_id: 'site-1' }],
    unlockedAchievementIds: ['already-unlocked'],
  })

  assert.deepEqual(newlySatisfied.map((item) => item.id), ['new-unlock'])
})
