import { Stack, usePathname, useGlobalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef } from 'react'
import { StatusBar } from 'react-native'
import { PostHogProvider } from 'posthog-react-native'
import { UserProvider } from '../contexts/UserContext'
import { I18nProvider } from '../contexts/I18nContext'
import { posthog } from '../lib/posthog'
import { useUser } from '../hooks/useUser'
import {
  configureSummaryNotificationChannel,
  getSummaryTargetFromNotification,
  Notifications,
} from '../lib/notifications'

const SummaryNotificationRouter = () => {
  const { user } = useUser()
  const router = useRouter()
  const pendingTargetRef = useRef(null)
  const handledNotificationRef = useRef(null)

  const navigateToSummary = useCallback((target) => {
    if (!target) return

    posthog.capture('summary_notification_opened', {
      period_type: target.periodType,
      summary_id: target.summaryId,
    })
    router.push({
      pathname: '/dashboard/summaryScreen',
      params: {
        periodType: target.periodType || '',
        startsOn: target.startsOn || '',
        summaryId: target.summaryId || '',
      },
    })
  }, [router])

  const openNotificationSummary = useCallback((response) => {
    const notificationId = response?.notification?.request?.identifier
    if (notificationId && handledNotificationRef.current === notificationId) return

    const target = getSummaryTargetFromNotification(response)
    if (!target) return

    Notifications.clearLastNotificationResponseAsync().catch(() => {})
    if (notificationId) handledNotificationRef.current = notificationId
    if (!user?.$id) {
      pendingTargetRef.current = target
      return
    }

    pendingTargetRef.current = null
    navigateToSummary(target)
  }, [navigateToSummary, user?.$id])

  useEffect(() => {
    configureSummaryNotificationChannel().catch(() => {})
    const subscription = Notifications.addNotificationResponseReceivedListener(
      openNotificationSummary
    )

    Notifications.getLastNotificationResponseAsync()
      .then(openNotificationSummary)
      .catch(() => {})

    return () => subscription.remove()
  }, [openNotificationSummary])

  useEffect(() => {
    if (!user?.$id || !pendingTargetRef.current) return

    const target = pendingTargetRef.current
    pendingTargetRef.current = null
    navigateToSummary(target)
  }, [navigateToSummary, user?.$id])

  return null
}

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
        <I18nProvider>
          <SummaryNotificationRouter />
          <StatusBar
            barStyle="dark-content"
            backgroundColor="transparent"
            translucent
            animated
          />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#ffffff' },
              statusBarStyle: 'dark',
              statusBarColor: 'transparent',
              statusBarTranslucent: true,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="auth" />
          </Stack>
        </I18nProvider>
      </UserProvider>
    </PostHogProvider>
  )
}

export default RootLayout
