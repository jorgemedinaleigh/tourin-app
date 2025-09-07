import { Stack } from 'expo-router'
import { StatusBar } from 'react-native'

const RootLayout = () => {

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <Stack>
        <Stack.Screen name="index" options={{title: 'Home', headerShown: false}}/>
        <Stack.Screen name="dashboard" options={{headerShown: false}}/>
      </Stack>
    </>
  )
}

export default RootLayout