export const LEGAL_TERMS_URL = 'https://dolmenxr.vercel.app/terms'
export const LEGAL_PRIVACY_URL = 'https://dolmenxr.vercel.app/privacy'
export const LEGAL_TERMS_VERSION = '2026-06-23'
export const LEGAL_PRIVACY_VERSION = '2026-06-23'

export const LEGAL_CONSENT_PROFILE_FIELDS = [
  'terms_accepted_at',
  'terms_accepted_version',
  'privacy_accepted_at',
  'privacy_accepted_version',
]

export function getLegalConsentStatus(profile = {}) {
  const termsAcceptedAt = profile?.terms_accepted_at || null
  const termsAcceptedVersion = profile?.terms_accepted_version || null
  const privacyAcceptedAt = profile?.privacy_accepted_at || null
  const privacyAcceptedVersion = profile?.privacy_accepted_version || null
  const termsIsCurrent = !!termsAcceptedAt && termsAcceptedVersion === LEGAL_TERMS_VERSION
  const privacyIsCurrent = !!privacyAcceptedAt && privacyAcceptedVersion === LEGAL_PRIVACY_VERSION

  return {
    terms: {
      acceptedAt: termsAcceptedAt,
      acceptedVersion: termsAcceptedVersion,
      requiredVersion: LEGAL_TERMS_VERSION,
      url: LEGAL_TERMS_URL,
      isCurrent: termsIsCurrent,
    },
    privacy: {
      acceptedAt: privacyAcceptedAt,
      acceptedVersion: privacyAcceptedVersion,
      requiredVersion: LEGAL_PRIVACY_VERSION,
      url: LEGAL_PRIVACY_URL,
      isCurrent: privacyIsCurrent,
    },
    isCurrent: termsIsCurrent && privacyIsCurrent,
  }
}

export function hasCurrentLegalConsent(profile = {}) {
  return getLegalConsentStatus(profile).isCurrent
}

export function buildLegalConsentPatch(acceptedAt = new Date()) {
  const acceptedAtValue = acceptedAt instanceof Date ? acceptedAt.toISOString() : acceptedAt

  return {
    terms_accepted_at: acceptedAtValue,
    terms_accepted_version: LEGAL_TERMS_VERSION,
    privacy_accepted_at: acceptedAtValue,
    privacy_accepted_version: LEGAL_PRIVACY_VERSION,
  }
}

export function buildLegalConsentMetadata() {
  return {
    legal_terms_accepted: true,
    legal_terms_version: LEGAL_TERMS_VERSION,
    legal_privacy_accepted: true,
    legal_privacy_version: LEGAL_PRIVACY_VERSION,
  }
}
