import getLocalizedField from '../i18n/getLocalizedField'

export const ACHIEVEMENT_RULE_TYPES = {
  MANUAL: 'manual',
  ROUTE_COMPLETED: 'route_completed',
  SITE_COUNT_BY_ATTRIBUTE: 'site_count_by_attribute',
}

export const SITE_COUNT_FIELDS = new Set([
  'type',
  'sub_type',
  'route_id',
  'region',
  'comuna',
  'is_free',
])

const SITE_FIELD_ALIASES = {
  type: ['type'],
  sub_type: ['subType', 'sub_type'],
  route_id: ['routeId', 'route_id'],
  region: ['region'],
  comuna: ['comuna'],
  is_free: ['isFree', 'is_free'],
}

const clampProgressPercent = (current, target) => {
  if (!Number.isFinite(target) || target <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)))
}

const normalizeId = (value) => String(value ?? '').trim()

const normalizeRuleType = (ruleType) => {
  const normalized = String(ruleType || ACHIEVEMENT_RULE_TYPES.MANUAL).trim().toLowerCase()
  return Object.values(ACHIEVEMENT_RULE_TYPES).includes(normalized)
    ? normalized
    : ACHIEVEMENT_RULE_TYPES.MANUAL
}

const normalizeRuleConfig = (config) => {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return {}
  return config
}

const isPublishedSite = (site) => site?.isPublished !== false && site?.is_published !== false

const getSiteId = (site) => normalizeId(site?.$id ?? site?.id)

const getVisitSiteId = (visit) => normalizeId(visit?.siteId ?? visit?.site_id)

export const getVisitedSiteIdSet = (visits = []) => {
  const visitedSiteIds = new Set()

  for (const visit of visits ?? []) {
    const siteId = getVisitSiteId(visit)
    if (siteId) visitedSiteIds.add(siteId)
  }

  return visitedSiteIds
}

const getSiteRouteId = (site) => normalizeId(site?.routeId ?? site?.route_id)

const normalizeComparableValue = (value) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  const normalized = String(value).trim().toLowerCase()
  return normalized || null
}

const collectComparableValues = (value, output) => {
  if (value === null || value === undefined) return

  if (Array.isArray(value)) {
    for (const item of value) collectComparableValues(item, output)
    return
  }

  if (typeof value === 'object') {
    for (const item of Object.values(value)) collectComparableValues(item, output)
    return
  }

  const normalized = normalizeComparableValue(value)
  if (normalized) output.add(normalized)
}

const getSiteFieldValues = (site, siteField, locale) => {
  const values = new Set()
  const fieldAliases = SITE_FIELD_ALIASES[siteField] ?? []

  for (const alias of fieldAliases) {
    collectComparableValues(site?.[alias], values)
    collectComparableValues(getLocalizedField(site, alias, locale, { defaultValue: null }), values)
  }

  return values
}

const normalizeSiteValues = (siteValues) => {
  const values = Array.isArray(siteValues) ? siteValues : [siteValues]
  return new Set(values.map(normalizeComparableValue).filter(Boolean))
}

const doesSiteMatchAttribute = (site, { locale, siteField, siteValues }) => {
  if (!SITE_COUNT_FIELDS.has(siteField)) return false

  const expectedValues = normalizeSiteValues(siteValues)
  if (!expectedValues.size) return false

  const actualValues = getSiteFieldValues(site, siteField, locale)
  for (const value of actualValues) {
    if (expectedValues.has(value)) return true
  }

  return false
}

const evaluateRouteCompleted = ({ config, sites, visitedSiteIds }) => {
  const routeId = normalizeId(config.routeId ?? config.route_id)
  const routeSites = (sites ?? [])
    .filter(isPublishedSite)
    .filter((site) => getSiteRouteId(site) === routeId)

  const target = routeSites.length
  const current = routeSites.filter((site) => visitedSiteIds.has(getSiteId(site))).length

  return {
    current,
    isSatisfied: target > 0 && current >= target,
    target,
    progressPercent: clampProgressPercent(current, target),
  }
}

const evaluateSiteCountByAttribute = ({ config, locale, sites, visitedSiteIds }) => {
  const siteField = String(config.siteField ?? config.site_field ?? '').trim().toLowerCase()
  const target = Math.max(0, Number.parseInt(config.target, 10) || 0)

  const matchingVisitedSiteIds = new Set()

  for (const site of sites ?? []) {
    if (!isPublishedSite(site)) continue

    const siteId = getSiteId(site)
    if (!siteId || !visitedSiteIds.has(siteId)) continue

    if (doesSiteMatchAttribute(site, {
      locale,
      siteField,
      siteValues: config.siteValues ?? config.site_values,
    })) {
      matchingVisitedSiteIds.add(siteId)
    }
  }

  const current = matchingVisitedSiteIds.size

  return {
    current,
    isSatisfied: target > 0 && current >= target,
    target,
    progressPercent: clampProgressPercent(current, target),
  }
}

export const evaluateAchievementRule = (achievement, context = {}) => {
  const ruleType = normalizeRuleType(achievement?.ruleType ?? achievement?.rule_type)
  const config = normalizeRuleConfig(achievement?.ruleConfig ?? achievement?.rule_config)
  const visitedSiteIds = context.visitedSiteIds ?? getVisitedSiteIdSet(context.visits)
  const sites = context.sites ?? []
  const locale = context.locale ?? 'es'

  if (ruleType === ACHIEVEMENT_RULE_TYPES.ROUTE_COMPLETED) {
    return {
      ruleType,
      ...evaluateRouteCompleted({ config, sites, visitedSiteIds }),
    }
  }

  if (ruleType === ACHIEVEMENT_RULE_TYPES.SITE_COUNT_BY_ATTRIBUTE) {
    return {
      ruleType,
      ...evaluateSiteCountByAttribute({ config, locale, sites, visitedSiteIds }),
    }
  }

  return {
    current: 0,
    isSatisfied: false,
    progressPercent: 0,
    ruleType: ACHIEVEMENT_RULE_TYPES.MANUAL,
    target: null,
  }
}

export const getNewlySatisfiedAchievements = (achievements, context = {}) => {
  const unlockedAchievementIds = new Set(
    (context.unlockedAchievementIds ?? []).map((achievementId) => normalizeId(achievementId)).filter(Boolean)
  )

  return (achievements ?? []).filter((achievement) => {
    const achievementId = normalizeId(achievement?.$id ?? achievement?.id)
    if (!achievementId || unlockedAchievementIds.has(achievementId)) return false

    return evaluateAchievementRule(achievement, context).isSatisfied
  })
}
