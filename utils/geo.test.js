import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCirclePolygonCoordinates, getDistanceMeters } from './geo'

test('getDistanceMeters returns zero for the same point', () => {
  assert.equal(getDistanceMeters(-33.4372, -70.6506, -33.4372, -70.6506), 0)
})

test('getDistanceMeters returns a known short-distance value', () => {
  const distance = getDistanceMeters(-33.4372, -70.6506, -33.4372, -70.6496)

  assert.ok(distance > 92)
  assert.ok(distance < 94)
})

test('buildCirclePolygonCoordinates returns a closed polygon ring', () => {
  const ring = buildCirclePolygonCoordinates(-33.4372, -70.6506, 100, 16)

  assert.equal(ring.length, 17)
  assert.deepEqual(ring[0], ring[ring.length - 1])
})

test('buildCirclePolygonCoordinates places points near the requested radius', () => {
  const centerLat = -33.4372
  const centerLon = -70.6506
  const radius = 75
  const ring = buildCirclePolygonCoordinates(centerLat, centerLon, radius, 32)

  for (const [lon, lat] of ring.slice(0, -1)) {
    const distance = getDistanceMeters(centerLat, centerLon, lat, lon)
    assert.ok(Math.abs(distance - radius) < 0.001)
  }
})
