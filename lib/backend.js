import 'react-native-get-random-values'
import 'react-native-url-polyfill/auto'

import Constants from 'expo-constants'
import { Amplify } from 'aws-amplify'
import {
  confirmSignUp,
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser as getAmplifyCurrentUser,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth'

const extra = Constants.expoConfig?.extra ?? {}

const requestedAuthProvider = extra.authProvider || 'appwrite'
const apiBaseUrlValue = typeof extra.apiBaseUrl === 'string' ? extra.apiBaseUrl.trim() : ''
const cognitoUserPoolId = typeof extra.cognitoUserPoolId === 'string' ? extra.cognitoUserPoolId.trim() : ''
const cognitoUserPoolClientId = typeof extra.cognitoUserPoolClientId === 'string' ? extra.cognitoUserPoolClientId.trim() : ''
const cognitoRegion = typeof extra.awsRegion === 'string' ? extra.awsRegion.trim() : ''

const isCognitoConfigured = Boolean(cognitoUserPoolId && cognitoUserPoolClientId && cognitoRegion)
const isApiConfigured = Boolean(apiBaseUrlValue)

export const apiBaseUrl = isApiConfigured ? apiBaseUrlValue.replace(/\/+$/, '') : null
export const authProvider = requestedAuthProvider === 'cognito' && isCognitoConfigured && isApiConfigured
  ? 'cognito'
  : 'appwrite'
export const backendMode = authProvider === 'cognito' ? 'aws' : 'appwrite'
export const isAwsEnabled = backendMode === 'aws'

let amplifyConfigured = false

export function ensureAmplifyConfigured() {
  if (authProvider !== 'cognito' || amplifyConfigured) {
    return
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: cognitoUserPoolId,
        userPoolClientId: cognitoUserPoolClientId,
        loginWith: {
          email: true,
        },
        signUpVerificationMethod: 'code',
      },
    },
  })

  amplifyConfigured = true
}

export async function signInWithCognito(email, password) {
  ensureAmplifyConfigured()

  const normalizedEmail = email.trim().toLowerCase()
  const result = await signIn({
    username: normalizedEmail,
    password,
  })

  if (!result?.isSignedIn) {
    throw new Error('La cuenta requiere un paso adicional para iniciar sesión.')
  }

  return result
}

export async function signUpWithCognito(email, password, name) {
  ensureAmplifyConfigured()

  const normalizedEmail = email.trim().toLowerCase()
  const result = await signUp({
    username: normalizedEmail,
    password,
    options: {
      userAttributes: {
        email: normalizedEmail,
        name: name.trim(),
      },
    },
  })

  return {
    email: normalizedEmail,
    requiresConfirmation: result?.nextStep?.signUpStep === 'CONFIRM_SIGN_UP',
  }
}

export async function confirmCognitoRegistration(email, confirmationCode) {
  ensureAmplifyConfigured()

  return confirmSignUp({
    username: email.trim().toLowerCase(),
    confirmationCode: confirmationCode.trim(),
  })
}

export async function signOutFromCognito() {
  ensureAmplifyConfigured()
  await signOut()
}

export async function getCurrentAppUser() {
  ensureAmplifyConfigured()

  const currentUser = await getAmplifyCurrentUser()
  const attributes = await fetchUserAttributes()

  try {
    const profile = await fetchCurrentProfile()
    return toAppUserFromBackend(profile)
  } catch (error) {
    return {
      $id: attributes?.sub || currentUser?.userId || currentUser?.username,
      email: attributes?.email || '',
      name: attributes?.name || attributes?.email || currentUser?.username || 'Usuario',
      $createdAt: new Date().toISOString(),
      photoUrl: null,
      prefs: {},
      stats: {
        score: 0,
        sitesVisited: 0,
        eventsAttended: 0,
        achievementsUnlocked: 0,
      },
      backendSyncError: error?.message || null,
    }
  }
}

export function toAppUserFromBackend(profile) {
  return {
    $id: profile.id,
    email: profile.email,
    name: profile.name,
    $createdAt: profile.createdAt,
    photoUrl: profile.avatarUrl || null,
    prefs: {
      avatarFileId: profile.avatarKey || null,
    },
    stats: profile.stats || {
      score: 0,
      sitesVisited: 0,
      eventsAttended: 0,
      achievementsUnlocked: 0,
    },
  }
}

export async function fetchCurrentProfile() {
  return fetchBackendJson('/v1/me')
}

export async function fetchPassport(siteId) {
  return fetchBackendJson('/v1/passport', {
    query: siteId ? { siteId } : undefined,
  })
}

export async function fetchAchievements() {
  return fetchBackendJson('/v1/achievements')
}

export async function fetchLeaderboard(sortBy = 'score') {
  return fetchBackendJson('/v1/leaderboard', {
    query: { sortBy },
    skipAuth: true,
  })
}

export async function stampSiteVisit(payload) {
  return fetchBackendJson('/v1/visits/stamp', {
    method: 'POST',
    body: payload,
  })
}

export async function createAvatarUploadUrl(payload) {
  return fetchBackendJson('/v1/profile/avatar/upload-url', {
    method: 'POST',
    body: payload,
  })
}

export async function completeAvatarUpload(payload) {
  return fetchBackendJson('/v1/profile/avatar/complete', {
    method: 'POST',
    body: payload,
  })
}

async function fetchBackendJson(path, options = {}) {
  if (!apiBaseUrl) {
    throw new Error('La API de AWS no está configurada.')
  }

  const url = new URL(path, `${apiBaseUrl}/`)
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && `${value}`.length) {
        url.searchParams.set(key, `${value}`)
      }
    }
  }

  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  }

  if (!options.skipAuth && authProvider === 'cognito') {
    ensureAmplifyConfigured()
    const session = await fetchAuthSession()
    const idToken = session?.tokens?.idToken?.toString()
    const accessToken = session?.tokens?.accessToken?.toString()
    const token = idToken || accessToken

    if (!token) {
      throw new Error('No pudimos obtener una sesión válida.')
    }

    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('json')
  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      payload?.detail ||
      payload?.message ||
      (typeof payload === 'string' ? payload : null) ||
      'No pudimos completar la solicitud.'
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}
