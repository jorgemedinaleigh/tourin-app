import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LEGAL_PRIVACY_VERSION,
  LEGAL_TERMS_VERSION,
  buildLegalConsentMetadata,
  buildLegalConsentPatch,
  getLegalConsentStatus,
  hasCurrentLegalConsent,
} from './legalDocuments'

test('recognizes current terms and privacy consent', () => {
  const profile = {
    terms_accepted_at: '2026-06-23T12:00:00.000Z',
    terms_accepted_version: LEGAL_TERMS_VERSION,
    privacy_accepted_at: '2026-06-23T12:00:00.000Z',
    privacy_accepted_version: LEGAL_PRIVACY_VERSION,
  }

  const status = getLegalConsentStatus(profile)

  assert.equal(status.terms.isCurrent, true)
  assert.equal(status.privacy.isCurrent, true)
  assert.equal(status.isCurrent, true)
  assert.equal(hasCurrentLegalConsent(profile), true)
})

test('requires accepted timestamps and current versions', () => {
  assert.equal(hasCurrentLegalConsent({}), false)
  assert.equal(hasCurrentLegalConsent({
    terms_accepted_at: '2026-06-23T12:00:00.000Z',
    terms_accepted_version: '2026-01-01',
    privacy_accepted_at: '2026-06-23T12:00:00.000Z',
    privacy_accepted_version: LEGAL_PRIVACY_VERSION,
  }), false)
  assert.equal(hasCurrentLegalConsent({
    terms_accepted_at: '2026-06-23T12:00:00.000Z',
    terms_accepted_version: LEGAL_TERMS_VERSION,
    privacy_accepted_version: LEGAL_PRIVACY_VERSION,
  }), false)
})

test('builds matching profile patch and registration metadata', () => {
  const acceptedAt = '2026-06-23T15:30:00.000Z'

  assert.deepEqual(buildLegalConsentPatch(acceptedAt), {
    terms_accepted_at: acceptedAt,
    terms_accepted_version: LEGAL_TERMS_VERSION,
    privacy_accepted_at: acceptedAt,
    privacy_accepted_version: LEGAL_PRIVACY_VERSION,
  })

  assert.deepEqual(buildLegalConsentMetadata(), {
    legal_terms_accepted: true,
    legal_terms_version: LEGAL_TERMS_VERSION,
    legal_privacy_accepted: true,
    legal_privacy_version: LEGAL_PRIVACY_VERSION,
  })
})
