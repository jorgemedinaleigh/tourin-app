import { Tabs } from 'expo-router'
import { useColorScheme } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '../../constants/Colors'
import { Ionicons } from '@expo/vector-icons'
import UserOnly from '../../components/auth/UserOnly'

const DashboardLayout = () => {

  const colorScheme = useColorScheme()
  const insets = useSafeAreaInsets()
  const theme = Colors[colorScheme] || Colors.light
  const bottomPadding = Math.max(insets.bottom, 12)

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
            title: 'Mapa',
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
            title: 'Pasaporte',
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
          name="achievementsScreen" 
          options={{ 
            title: 'Logros',
            tabBarIcon: ({ focused }) => (
              <Ionicons 
                size={24} 
                name={focused ? "trophy" : "trophy-outline"} 
                color={focused ? theme.iconColorFocused : theme.iconColor}
              />
            )
          }} 
        />
        <Tabs.Screen 
          name="profileScreen" 
          options={{ 
            title: 'Perfil',
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
