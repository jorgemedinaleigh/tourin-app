import { Stack } from "expo-router";
import { useUser } from "../../hooks/useUser";


export default function AuthLayout() {
  const { user } = useUser()
  

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
    </>
  )
}