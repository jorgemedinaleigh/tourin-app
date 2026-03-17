import { createContext, useEffect, useState } from 'react'
import { account } from '../lib/appwrite'
import { ID } from 'react-native-appwrite'
import { posthog } from '../lib/posthog'
import {
  authProvider,
  confirmCognitoRegistration,
  getCurrentAppUser,
  signInWithCognito,
  signOutFromCognito,
  signUpWithCognito,
} from '../lib/backend'

export const UserContext = createContext()

export function UserProvider({ children }){
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  function identifyUser(nextUser) {
    if (!nextUser?.$id) {
      return
    }

    posthog.identify(nextUser.$id, {
      $set: {
        email: nextUser.email,
        name: nextUser.name,
      },
    })
  }

  async function login(email, password) {
    try {
      if (authProvider === 'cognito') {
        await signInWithCognito(email, password)
        const response = await getCurrentAppUser()
        setUser(response)
        identifyUser(response)

        posthog.capture('user_logged_in', {
          user_id: response.$id,
          email: response.email,
        })

        return response
      }

      await account.createEmailPasswordSession(email, password)
      const response = await account.get()
      setUser(response)

      // Identify user in PostHog on successful login
      identifyUser(response)
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
      if (authProvider === 'cognito') {
        const result = await signUpWithCognito(email, password, name)

        if (!result.requiresConfirmation) {
          await login(email, password)
        }

        posthog.capture('user_signed_up', {
          email,
          name,
          requires_confirmation: result.requiresConfirmation,
        })

        return result
      }

      await account.create(ID.unique(), email, password, name)
      await login(email, password)

      // Capture signup event (identify already called in login)
      posthog.capture('user_signed_up', {
        email: email,
        name: name,
      })

      return {
        requiresConfirmation: false,
        email,
      }
    }
    catch (error) {
      throw Error(error.message)
    }
  }

  async function confirmRegistration(email, confirmationCode) {
    if (authProvider !== 'cognito') {
      return { confirmed: true }
    }

    await confirmCognitoRegistration(email, confirmationCode)
    posthog.capture('user_signup_confirmed', {
      email,
    })

    return { confirmed: true }
  }

  async function logout() {
    // Capture logout event before resetting PostHog
    posthog.capture('user_logged_out')

    if (authProvider === 'cognito') {
      await signOutFromCognito()
    } else {
      await account.deleteSession('current')
    }

    setUser(null)

    // Reset PostHog to unlink future events from this user
    posthog.reset()
  }

  async function getInitialUserValue() {
    try {
      if (authProvider === 'cognito') {
        const response = await getCurrentAppUser()
        setUser(response)
        identifyUser(response)
        return
      }

      const response = await account.get()
      setUser(response)

      // Re-identify user on app load if already logged in
      identifyUser(response)
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
    <UserContext.Provider value={{ user, login, register, confirmRegistration, logout, authChecked, authProvider }} >
      {children}
    </UserContext.Provider>
  )
}
