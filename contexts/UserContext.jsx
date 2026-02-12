import { createContext, useEffect, useState } from 'react'
import { account } from '../lib/appwrite'
import { ID } from 'react-native-appwrite'
import { posthog } from '../lib/posthog'

export const UserContext = createContext()

export function UserProvider({ children }){
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  async function login(email, password) {
    try {
      await account.createEmailPasswordSession(email, password)
      const response = await account.get()
      setUser(response)

      // Identify user in PostHog on successful login
      posthog.identify(response.$id, {
        $set: {
          email: response.email,
          name: response.name,
        },
      })
      posthog.capture('user_logged_in', {
        user_id: response.$id,
        email: response.email,
      })
    }
    catch (error) {
      throw Error(error.message)
    }
  }
  async function register(email, password, name) {
    try {
      await account.create(ID.unique(), email, password, name)
      await login(email, password)

      // Capture signup event (identify already called in login)
      posthog.capture('user_signed_up', {
        email: email,
        name: name,
      })
    }
    catch (error) {
      throw Error(error.message)
    }
  }
  async function logout() {
    // Capture logout event before resetting PostHog
    posthog.capture('user_logged_out')

    await account.deleteSession('current')
    setUser(null)

    // Reset PostHog to unlink future events from this user
    posthog.reset()
  }
  async function getInitialUserValue() {
    try {
      const response = await account.get()
      setUser(response)

      // Re-identify user on app load if already logged in
      posthog.identify(response.$id, {
        $set: {
          email: response.email,
          name: response.name,
        },
      })
    } catch (error) {
      setUser(null)
    } finally {
      setAuthChecked(true)
    }
  }

  useEffect(() => {
    getInitialUserValue()
  }, [])

  return (
    <UserContext.Provider value={{ user, login, register, logout, authChecked }} >
      {children}
    </UserContext.Provider>
  )
}
