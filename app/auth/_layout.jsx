import { Stack } from "expo-router";
import { useUser } from "../../hooks/useUser";
import GuestOnly from "../../components/auth/GuestOnly";


export default function AuthLayout() {
  const { user } = useUser()
  

  return (
    <GuestOnly>
      <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
    </GuestOnly>
  )
}