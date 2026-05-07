import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRouteLabelMap, resolveSiteRouteLabel } from './routeLabels'

test('resolves a site route label from routeId', () => {
  const routeLabelsById = buildRouteLabelMap([
    { id: 'route-1', name: { es: 'Ruta Patrimonial', en: 'Heritage Route' } },
  ], 'es')

  assert.equal(
    resolveSiteRouteLabel({ routeId: 'route-1' }, routeLabelsById, 'es'),
    'Ruta Patrimonial'
  )
})

test('falls back to the legacy site route field when no matching route exists', () => {
  const routeLabelsById = buildRouteLabelMap([
    { id: 'route-1', name: { es: 'Ruta Patrimonial' } },
  ], 'es')

  assert.equal(
    resolveSiteRouteLabel({ routeId: 'missing-route', route: 'Ruta Legacy' }, routeLabelsById, 'es'),
    'Ruta Legacy'
  )
})

test('returns null when the site has no resolvable route label', () => {
  const routeLabelsById = buildRouteLabelMap([], 'es')

  assert.equal(resolveSiteRouteLabel({ routeId: null, route: '' }, routeLabelsById, 'es'), null)
})

test('uses the active locale from localized route names', () => {
  const routeRows = [
    { id: 12, name: { es: 'Ruta Centro', en: 'Downtown Route', pt: 'Rota Centro' } },
  ]

  assert.equal(
    resolveSiteRouteLabel({ routeId: 12 }, buildRouteLabelMap(routeRows, 'en'), 'en'),
    'Downtown Route'
  )

  assert.equal(
    resolveSiteRouteLabel({ routeId: 12 }, buildRouteLabelMap(routeRows, 'pt'), 'pt'),
    'Rota Centro'
  )
})
