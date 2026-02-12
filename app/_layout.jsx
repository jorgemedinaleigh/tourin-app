import { Stack, usePathname, useGlobalSearchParams } from 'expo-router'
import { useEffect, useRef } from 'react'
import { StatusBar } from 'react-native'
import { PostHogProvider } from 'posthog-react-native'
import { UserProvider } from '../contexts/UserContext'
import { posthog } from '../lib/posthog'

const RootLayout = () => {
  const pathname = usePathname()
  const params = useGlobalSearchParams()
  const previousPathname = useRef(undefined)

  // Manual screen tracking for Expo Router
  // @see https://docs.expo.dev/router/reference/screen-tracking/
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        ...params,
      })
      previousPathname.current = pathname
    }
  }, [pathname, params])

  return (
    <PostHogProvider
      client={posthog}
      autocapture={{
        captureScreens: false, // Manual tracking with Expo Router
        captureTouches: true,
        propsToCapture: ['testID'],
        maxElementsCaptured: 20,
      }}
    >
      <UserProvider>
        <StatusBar barStyle="dark-content" />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }}/>
          <Stack.Screen name="dashboard" options={{headerShown: false}}/>
          <Stack.Screen name="auth" options={{headerShown: false}}/>
        </Stack>
      </UserProvider>
    </PostHogProvider>
  )
}

export default RootLayout
