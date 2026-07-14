import { createContext, useEffect, useState } from 'react'
import * as Linking from 'expo-linking'
import { supabase } from '../lib/supabase'
import { posthog } from '../lib/posthog'
import { normalizeCountryCode } from '../utils/profileDetails'
import {
  isSubdivisionRequired,
  isValidSubdivisionForCountry,
  normalizeSubdivisionCode,
} from '../utils/countrySubdivisions'
import {
  areExplorationModesEqual,
  hasValidExplorationModes,
  normalizeExplorationModes,
} from '../utils/explorationModes'
import {
  LEGAL_CONSENT_PROFILE_FIELDS,
  LEGAL_PRIVACY_VERSION,
  LEGAL_TERMS_VERSION,
  buildLegalConsentMetadata,
  buildLegalConsentPatch,
  getLegalConsentStatus,
} from '../lib/legalDocuments'

export const UserContext = createContext()

const DEFAULT_LOCALE = 'es'
const PROFILE_COLUMNS = [
  'id',
  'display_name',
  'locale',
  'avatar_path',
  'country_code',
  'subdivision_code',
  'exploration_modes',
  'welcome_seen_at',
  ...LEGAL_CONSENT_PROFILE_FIELDS,
  'created_at',
  'updated_at',
].join(', ')
const PRIVATE_DETAILS_COLUMNS = 'user_id, date_of_birth, created_at, updated_at'
const REGISTRATION_REDIRECT_PATH = '/auth/loginScreen'
const REGISTRATION_SOURCE = 'tourin_app'
const REGISTRATION_METADATA_KEYS = [
  'country_code',
  'subdivision_code',
  'exploration_modes',
  'date_of_birth',
  'registration_source',
  'legal_terms_accepted',
  'legal_terms_version',
  'legal_privacy_accepted',
  'legal_privacy_version',
]

const getMetadataName = (authUser) =>
  authUser?.user_metadata?.display_name ||
  authUser?.user_metadata?.name ||
  authUser?.email?.split('@')?.[0] ||
  ''

const hasRegistrationMetadata = (metadata = {}) =>
  REGISTRATION_METADATA_KEYS.some((key) => Object.prototype.hasOwnProperty.call(metadata, key))

const getCleanRegistrationMetadata = (metadata = {}) => {
  const cleanedMetadata = {}

  if (Object.prototype.hasOwnProperty.call(metadata, 'name')) {
    cleanedMetadata.name = metadata.name
  }
  if (Object.prototype.hasOwnProperty.call(metadata, 'display_name')) {
    cleanedMetadata.display_name = metadata.display_name
  }
  if (Object.prototype.hasOwnProperty.call(metadata, 'prefs')) {
    cleanedMetadata.prefs = metadata.prefs
  }

  return cleanedMetadata
}

function normalizeUser(authUser, profile, privateDetails) {
  if (!authUser) return null

  const metadata = authUser.user_metadata || {}
  const metadataPrefs = metadata.prefs || {}
  const legalConsent = getLegalConsentStatus(profile)
  const prefs = {
    ...metadataPrefs,
    locale: profile?.locale || metadataPrefs.locale || DEFAULT_LOCALE,
  }

  if (profile?.avatar_path) {
    prefs.avatarPath = profile.avatar_path
  }

  return {
    ...authUser,
    $id: authUser.id,
    $createdAt: authUser.created_at,
    email: authUser.email,
    name: profile?.display_name || getMetadataName(authUser),
    countryCode: profile?.country_code || null,
    subdivisionCode: profile?.subdivision_code || null,
    explorationModes: normalizeExplorationModes(profile?.exploration_modes),
    dateOfBirth: privateDetails?.date_of_birth || null,
    hasSeenWelcome: !!profile?.welcome_seen_at,
    privateDetails: privateDetails || null,
    legalConsent,
    prefs,
    profile,
    rawAuthUser: authUser,
  }
}

export function UserProvider({ children }){
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  async function getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async function createProfile(authUser, overrides = {}) {
    const explorationModes = normalizeExplorationModes(overrides.exploration_modes)
    const payload = {
      id: authUser.id,
      display_name: overrides.display_name || getMetadataName(authUser),
      locale: overrides.locale || authUser.user_metadata?.prefs?.locale || DEFAULT_LOCALE,
      avatar_path: overrides.avatar_path || null,
      country_code: overrides.country_code || null,
      subdivision_code: overrides.subdivision_code || null,
      exploration_modes: explorationModes.length ? explorationModes : null,
    }

    LEGAL_CONSENT_PROFILE_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(overrides, field)) {
        payload[field] = overrides[field]
      }
    })

    const { data, error } = await supabase
      .from('profiles')
      .insert(payload)
      .select(PROFILE_COLUMNS)
      .single()

    if (error?.code === '23505') {
      return getProfile(authUser.id)
    }

    if (error) throw error
    return data
  }

  async function getPrivateDetails(userId) {
    const { data, error } = await supabase
      .from('user_private_details')
      .select(PRIVATE_DETAILS_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async function ensureProfile(authUser, overrides = {}) {
    const existingProfile = await getProfile(authUser.id)
    if (existingProfile) {
      const profilePatch = {}

      if (overrides.display_name && existingProfile.display_name !== overrides.display_name) {
        profilePatch.display_name = overrides.display_name
      }
      if (Object.prototype.hasOwnProperty.call(overrides, 'country_code') && existingProfile.country_code !== overrides.country_code) {
        profilePatch.country_code = overrides.country_code
      }
      if (Object.prototype.hasOwnProperty.call(overrides, 'subdivision_code') && existingProfile.subdivision_code !== overrides.subdivision_code) {
        profilePatch.subdivision_code = overrides.subdivision_code
      }
      if (
        Object.prototype.hasOwnProperty.call(overrides, 'exploration_modes') &&
        !areExplorationModesEqual(existingProfile.exploration_modes, overrides.exploration_modes)
      ) {
        const explorationModes = normalizeExplorationModes(overrides.exploration_modes)
        profilePatch.exploration_modes = explorationModes.length ? explorationModes : null
      }
      if (!getLegalConsentStatus(existingProfile).isCurrent) {
        LEGAL_CONSENT_PROFILE_FIELDS.forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(overrides, field) && existingProfile[field] !== overrides[field]) {
            profilePatch[field] = overrides[field]
          }
        })
      }

      if (Object.keys(profilePatch).length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .update(profilePatch)
          .eq('id', authUser.id)
          .select(PROFILE_COLUMNS)
          .single()

        if (error) throw error
        return data
      }

      return existingProfile
    }

    return createProfile(authUser, overrides)
  }

  async function upsertPrivateDetails(userId, details = {}) {
    const payload = {
      user_id: userId,
      date_of_birth: details.dateOfBirth,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('user_private_details')
      .upsert(payload, { onConflict: 'user_id' })
      .select(PRIVATE_DETAILS_COLUMNS)
      .single()

    if (error) throw error
    return data
  }

  async function cleanupRegistrationMetadata(authUser) {
    const metadata = authUser?.user_metadata || {}
    if (!hasRegistrationMetadata(metadata)) return authUser

    try {
      const { error } = await supabase.rpc('cleanup_registration_metadata')
      if (error) throw error

      return {
        ...authUser,
        user_metadata: getCleanRegistrationMetadata(metadata),
      }
    } catch (error) {
      console.warn('Failed to clean registration metadata', error)
      return authUser
    }
  }

  async function setCurrentUser(authUser, options = {}) {
    if (!authUser) {
      setUser(null)
      return null
    }

    const profile = await ensureProfile(authUser, options.profile || {})
    const privateDetails = options.privateDetails || await getPrivateDetails(authUser.id)
    const cleanedAuthUser = await cleanupRegistrationMetadata(authUser)
    const normalizedUser = normalizeUser(cleanedAuthUser, profile, privateDetails)
    setUser(normalizedUser)

    if (options.identify) {
      posthog.identify(normalizedUser.$id)
    }

    return normalizedUser
  }

  async function login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) throw error

      const response = await setCurrentUser(data.user, { identify: true })

      posthog.capture('user_logged_in', {
        user_id: response.$id,
      })

      return response
    }
    catch (error) {
      throw error
    }
  }

  async function register(email, password, name, details = {}) {
    const trimmedEmail = email.trim()
    const trimmedName = name.trim()
    const countryCode = normalizeCountryCode(details.countryCode)
    const requestedSubdivisionCode = normalizeSubdivisionCode(details.subdivisionCode)
    const subdivisionCode = isValidSubdivisionForCountry(countryCode, requestedSubdivisionCode)
      ? requestedSubdivisionCode
      : null
    const explorationModes = normalizeExplorationModes(details.explorationModes)
    const legalConsentMetadata = buildLegalConsentMetadata()
    const legalConsentPatch = buildLegalConsentPatch()

    if (isSubdivisionRequired(countryCode) && !subdivisionCode) {
      const error = new Error('A valid subdivision is required for this country')
      error.code = 'invalid_subdivision'
      throw error
    }

    if (!hasValidExplorationModes(explorationModes)) {
      const error = new Error('At least one exploration mode is required')
      error.code = 'missing_exploration_mode'
      throw error
    }

    if (!details.termsAccepted || !details.privacyAccepted) {
      const error = new Error('Legal consent is required')
      error.code = 'missing_legal_consent'
      throw error
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: Linking.createURL(REGISTRATION_REDIRECT_PATH),
          data: {
            name: trimmedName,
            display_name: trimmedName,
            country_code: countryCode,
            subdivision_code: subdivisionCode,
            exploration_modes: explorationModes,
            date_of_birth: details.dateOfBirth,
            registration_source: REGISTRATION_SOURCE,
            ...legalConsentMetadata,
            prefs: {
              locale: DEFAULT_LOCALE,
            },
          },
        },
      })

      if (error) throw error

      if (!data.session) {
        const userId = data.user?.id || null

        posthog.capture('user_signed_up', {
          user_id: userId,
          status: 'confirmation_required',
        })

        return {
          status: 'confirmation_required',
          userId,
        }
      }

      if (!data.user) throw new Error('Registration failed')

      const response = await setCurrentUser(data.user, {
        identify: true,
        profile: {
          display_name: trimmedName,
          country_code: countryCode,
          subdivision_code: subdivisionCode,
          exploration_modes: explorationModes,
          ...legalConsentPatch,
        },
      })

      posthog.capture('user_signed_up', {
        user_id: response.$id,
        status: 'signed_in',
      })

      return {
        status: 'signed_in',
        user: response,
      }
    }
    catch (error) {
      throw error
    }
  }

  async function acceptLegalDocuments() {
    if (!user) return null

    const authUser = user.rawAuthUser || { id: user.$id, email: user.email }
    const patch = buildLegalConsentPatch()

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', user.$id)
        .select(PROFILE_COLUMNS)
        .single()

      if (error) throw error

      const privateDetails = user.privateDetails || await getPrivateDetails(user.$id)
      const response = normalizeUser(authUser, profile, privateDetails)
      setUser(response)

      posthog.capture('legal_documents_accepted', {
        terms_version: LEGAL_TERMS_VERSION,
        privacy_version: LEGAL_PRIVACY_VERSION,
      })

      return response
    } catch (error) {
      posthog.capture('legal_documents_accept_failed', {
        error_code: error?.code || error?.status || error?.name || 'unknown',
      })
      throw error
    }
  }

  async function markWelcomeSeen() {
    if (!user) return null
    if (user.hasSeenWelcome) return user

    const welcomeSeenAt = new Date().toISOString()
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ welcome_seen_at: welcomeSeenAt })
      .eq('id', user.$id)
      .select(PROFILE_COLUMNS)
      .single()

    if (error) throw error

    const authUser = user.rawAuthUser || { id: user.$id, email: user.email }
    const response = normalizeUser(authUser, profile, user.privateDetails)
    setUser(response)
    return response
  }

  async function updateProfileDetails(details = {}) {
    if (!user) return null

    const countryCode = normalizeCountryCode(details.countryCode)
    const requestedSubdivisionCode = normalizeSubdivisionCode(details.subdivisionCode)
    const subdivisionCode = isValidSubdivisionForCountry(countryCode, requestedSubdivisionCode)
      ? requestedSubdivisionCode
      : null
    const explorationModes = normalizeExplorationModes(details.explorationModes)

    if (isSubdivisionRequired(countryCode) && !subdivisionCode) {
      const error = new Error('A valid subdivision is required for this country')
      error.code = 'invalid_subdivision'
      throw error
    }

    if (!hasValidExplorationModes(explorationModes)) {
      const error = new Error('At least one exploration mode is required')
      error.code = 'missing_exploration_mode'
      throw error
    }

    try {
      const authUser = user.rawAuthUser || { id: user.$id, email: user.email }
      let profile = user.profile || await ensureProfile(authUser)

      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update({
          country_code: countryCode,
          subdivision_code: subdivisionCode,
          exploration_modes: explorationModes,
        })
        .eq('id', user.$id)
        .select(PROFILE_COLUMNS)
        .single()

      if (profileError) throw profileError
      profile = updatedProfile

      const privateDetails = await upsertPrivateDetails(user.$id, {
        dateOfBirth: details.dateOfBirth,
      })

      const response = normalizeUser(authUser, profile, privateDetails)
      setUser(response)
      return response
    } catch (error) {
      throw Error(error.message)
    }
  }

  async function logout() {
    posthog.capture('user_logged_out')

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.warn('Backend session deletion failed', error)
    } finally {
      setUser(null)
      posthog.reset()
    }
  }

  async function updatePrefs(patch) {
    if (!user) return null

    try {
      const nextPrefs = {
        ...(user?.prefs || {}),
        ...patch,
      }
      const profilePatch = {}

      if (Object.prototype.hasOwnProperty.call(patch, 'locale')) {
        profilePatch.locale = patch.locale
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'avatarPath')) {
        profilePatch.avatar_path = patch.avatarPath
      }

      let profile = user.profile || await ensureProfile(user.rawAuthUser || { id: user.$id, email: user.email })
      if (Object.keys(profilePatch).length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .update(profilePatch)
          .eq('id', user.$id)
          .select(PROFILE_COLUMNS)
          .single()

        if (error) throw error
        profile = data
      }

      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...getCleanRegistrationMetadata(user.rawAuthUser?.user_metadata || {}),
          prefs: nextPrefs,
        },
      })

      if (error) throw error

      const privateDetails = user.privateDetails || await getPrivateDetails(user.$id)
      const response = normalizeUser(data.user || user.rawAuthUser, profile, privateDetails)
      setUser(response)
      return response
    } catch (error) {
      throw Error(error.message)
    }
  }

  async function getInitialUserValue() {
    try {
      const { data, error } = await supabase.auth.getUser()

      if (error || !data.user) {
        setUser(null)
        return
      }

      const response = await setCurrentUser(data.user, { identify: true })

      return response
    } catch (error) {
      console.warn('Failed to restore Supabase session', error)
      setUser(null)
    } finally {
      setAuthChecked(true)
    }
  }

  useEffect(() => {
    let alive = true

    getInitialUserValue()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user

      if (!authUser) {
        if (alive) {
          setUser(null)
          setAuthChecked(true)
        }
        return
      }

      setTimeout(() => {
        if (!alive) return

        setCurrentUser(authUser).catch((error) => {
          console.warn('Failed to sync Supabase auth state', error)
        })
      }, 0)
    })

    return () => {
      alive = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  return (
    <UserContext.Provider value={{ user, login, register, logout, authChecked, updatePrefs, updateProfileDetails, acceptLegalDocuments, markWelcomeSeen }} >
      {children}
    </UserContext.Provider>
  )
}
