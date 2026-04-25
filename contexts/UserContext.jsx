import { createContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { posthog } from '../lib/posthog'

export const UserContext = createContext()

const DEFAULT_LOCALE = 'es'
const PROFILE_COLUMNS = 'id, display_name, locale, avatar_path, created_at, updated_at'

const getMetadataName = (authUser) =>
  authUser?.user_metadata?.display_name ||
  authUser?.user_metadata?.name ||
  authUser?.email?.split('@')?.[0] ||
  ''

function normalizeUser(authUser, profile) {
  if (!authUser) return null

  const metadata = authUser.user_metadata || {}
  const metadataPrefs = metadata.prefs || {}
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
    const payload = {
      id: authUser.id,
      display_name: overrides.display_name || getMetadataName(authUser),
      locale: overrides.locale || authUser.user_metadata?.prefs?.locale || DEFAULT_LOCALE,
      avatar_path: overrides.avatar_path || null,
    }

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

  async function ensureProfile(authUser, overrides = {}) {
    const existingProfile = await getProfile(authUser.id)
    if (existingProfile) return existingProfile

    return createProfile(authUser, overrides)
  }

  async function setCurrentUser(authUser, options = {}) {
    if (!authUser) {
      setUser(null)
      return null
    }

    const profile = await ensureProfile(authUser, options.profile || {})
    const normalizedUser = normalizeUser(authUser, profile)
    setUser(normalizedUser)

    if (options.identify) {
      posthog.identify(normalizedUser.$id, {
        $set: {
          email: normalizedUser.email,
          name: normalizedUser.name,
        },
      })
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
        email: response.email,
      })

      return response
    }
    catch (error) {
      throw Error(error.message)
    }
  }

  async function register(email, password, name) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            display_name: name.trim(),
            prefs: {
              locale: DEFAULT_LOCALE,
            },
          },
        },
      })

      if (error) throw error

      if (!data.session || !data.user) {
        throw new Error('Please verify your email before signing in.')
      }

      const response = await setCurrentUser(data.user, {
        identify: true,
        profile: {
          display_name: name.trim(),
        },
      })

      posthog.capture('user_signed_up', {
        user_id: response.$id,
        email: response.email,
        name: response.name,
      })

      return response
    }
    catch (error) {
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
          ...(user.rawAuthUser?.user_metadata || {}),
          prefs: nextPrefs,
        },
      })

      if (error) throw error

      const response = normalizeUser(data.user || user.rawAuthUser, profile)
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
    <UserContext.Provider value={{ user, login, register, logout, authChecked, updatePrefs }} >
      {children}
    </UserContext.Provider>
  )
}
