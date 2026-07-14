import assert from 'node:assert/strict'
import test from 'node:test'
import {
  EXPLORATION_MODES,
  areExplorationModesEqual,
  hasValidExplorationModes,
  normalizeExplorationModes,
} from './explorationModes.js'

test('normalizes exploration modes to known values in stable order', () => {
  assert.deepEqual(
    normalizeExplorationModes([' FRIENDS ', 'solo', 'friends', 'unknown']),
    ['solo', 'friends']
  )
})

test('requires at least one valid exploration mode', () => {
  assert.equal(hasValidExplorationModes([]), false)
  assert.equal(hasValidExplorationModes(['unknown']), false)
  assert.equal(hasValidExplorationModes(['family']), true)
})

test('compares exploration selections independently of input order', () => {
  assert.equal(areExplorationModesEqual(['friends', 'solo'], ['solo', 'friends']), true)
  assert.equal(areExplorationModesEqual(['solo'], ['couple']), false)
  assert.equal(EXPLORATION_MODES.length, 5)
})
