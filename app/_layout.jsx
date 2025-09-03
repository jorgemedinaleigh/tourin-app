import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"

const RootLayout = () => {

  return (
    <>
      <StatusBar value="auto" />
      <Stack>
        <Stack.Screen name="index" options={{title: 'Home', headerShown: false}}/>
        <Stack.Screen name="dashboard" options={{headerShown: false}}/>
      </Stack>
    </>
  )
}

export default RootLayout