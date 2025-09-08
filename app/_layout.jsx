import { Stack } from 'expo-router'
import { StatusBar } from 'react-native'
import { UserProvider } from '../contexts/UserContext'

const RootLayout = () => {

  return (
    <UserProvider>
      <StatusBar barStyle="dark-content" />
      <Stack>
        <Stack.Screen name="index" options={{title: 'Home'}}/>
        <Stack.Screen name="dashboard" options={{headerShown: false}}/>
        <Stack.Screen name="auth" options={{headerShown: false}}/>
      </Stack>
    </UserProvider>
  )
}

export default RootLayout