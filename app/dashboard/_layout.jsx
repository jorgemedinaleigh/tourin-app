import { Tabs } from 'expo-router'
import { useColorScheme } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '../../constants/Colors'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import UserOnly from '../../components/auth/UserOnly'

const DashboardLayout = () => {

  const colorScheme = useColorScheme()
  const insets = useSafeAreaInsets()
  const theme = Colors[colorScheme] || Colors.light
  const bottomPadding = Math.max(insets.bottom, 12)
  const { t } = useTranslation('common')

  return (
    <UserOnly>
      <Tabs 
        screenOptions={{ 
          headerShown: false, 
          sceneStyle: {
            backgroundColor: theme.background,
          },
          tabBarStyle: {
            backgroundColor: theme.navBackground,
            paddingTop: 10,
            paddingBottom: bottomPadding,
            height: 78 + bottomPadding,
          },
          safeAreaInsets: { bottom: insets.bottom },
          tabBarActiveTintColor: theme.iconColorFocused,
          tabBarInactiveTintColor: theme.iconColor,
        }}
      >
        <Tabs.Screen 
          name="mapScreen" 
          options={{ 
            title: t('tabs.map'),
            tabBarIcon: ({ focused }) => (
              <Ionicons 
                size={24} 
                name={focused ? "compass" : "compass-outline"} 
                color={focused ? theme.iconColorFocused : theme.iconColor}
              />
            )
          }} 
        />
        <Tabs.Screen 
          name="passportScreen" 
          options={{ 
            title: t('tabs.passport'),
            tabBarIcon: ({ focused }) => (
              <Ionicons 
                size={24} 
                name={focused ? "bookmarks" : "bookmarks-outline"} 
                color={focused ? theme.iconColorFocused : theme.iconColor}
              />
            )
          }} 
        />
        <Tabs.Screen
          name="suggestedRoutesScreen"
          options={{
            title: t('tabs.routes'),
            tabBarIcon: ({ focused }) => (
              <Ionicons
                size={24}
                name={focused ? "map" : "map-outline"}
                color={focused ? theme.iconColorFocused : theme.iconColor}
              />
            )
          }}
        />
        <Tabs.Screen
          name="achievementsScreen"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="routeDetails"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen 
          name="profileScreen" 
          options={{ 
            title: t('tabs.profile'),
            tabBarIcon: ({ focused }) => (
              <Ionicons 
                size={24} 
                name={focused ? "person" : "person-outline"} 
                color={focused ? theme.iconColorFocused : theme.iconColor}
              />
            )
          }} 
        />
      </Tabs>
    </UserOnly>
  )
}

export default DashboardLayout
