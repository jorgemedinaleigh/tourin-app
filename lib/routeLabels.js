import getLocalizedField from '../i18n/getLocalizedField'

const trimString = (value) => (value === null || value === undefined ? '' : String(value).trim())

const normalizeRouteKey = (value) => trimString(value ?? '')

const normalizeLabel = (value) => {
  const label = trimString(value)
  return label || null
}

export const buildRouteLabelMap = (routeRows, locale) => {
  const labelsById = new Map()

  for (const row of routeRows ?? []) {
    const routeId = normalizeRouteKey(row?.$id ?? row?.id)
    if (!routeId) continue

    const label = normalizeLabel(
      getLocalizedField(row, 'name', locale, { defaultValue: '' })
    )
    if (!label) continue

    labelsById.set(routeId, label)
  }

  return labelsById
}

export const resolveSiteRouteLabel = (siteRow, routeLabelsById, locale) => {
  const routeId = normalizeRouteKey(siteRow?.routeId ?? siteRow?.route_id)
  const routeLabel = routeId ? routeLabelsById?.get(routeId) : null

  return routeLabel || normalizeLabel(
    getLocalizedField(siteRow, 'route', locale, { defaultValue: '' })
  )
}
