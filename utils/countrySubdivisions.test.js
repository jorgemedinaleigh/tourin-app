import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getSubdivisionLabel,
  getSubdivisionOptions,
  getSubdivisionType,
  isSubdivisionRequired,
  isValidSubdivisionForCountry,
  normalizeSubdivisionCode,
} from './countrySubdivisions.js'

test('Chile requires one of its 16 ISO 3166-2 regions', () => {
  assert.equal(isSubdivisionRequired('CL'), true)
  assert.equal(getSubdivisionType('CL'), 'region')
  assert.equal(getSubdivisionOptions('CL', 'es').length, 16)
  assert.equal(isValidSubdivisionForCountry('CL', 'CL-RM'), true)
  assert.equal(isValidSubdivisionForCountry('CL', 'CL-XX'), false)
})

test('countries without subdivision configuration do not require a selection', () => {
  assert.equal(isSubdivisionRequired('US'), false)
  assert.deepEqual(getSubdivisionOptions('US', 'en'), [])
  assert.equal(isValidSubdivisionForCountry('US', 'US-CA'), false)
})

test('subdivision codes and labels are normalized and localized', () => {
  assert.equal(normalizeSubdivisionCode(' cl-rm '), 'CL-RM')
  assert.equal(getSubdivisionLabel('CL', 'cl-rm', 'en'), 'Santiago Metropolitan')
  assert.equal(getSubdivisionLabel('CL', 'CL-RM', 'es'), 'Metropolitana de Santiago')
})
