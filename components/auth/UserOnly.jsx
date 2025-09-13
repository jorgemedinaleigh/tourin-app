import { useRouter } from "expo-router"
import { useUser } from "../../hooks/useUser"
import { useEffect } from "react"
import { Text } from "react-native"

const UserOnly = ({ children }) => {
  const { user, authChecked } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (authChecked && user === null) {
      router.replace('auth/loginScreen')
    }
  }, [user, authChecked])

  if (!authChecked || !user) {
    return (
      <Text>Cargando...</Text>
    )
  }
  return children
}

export default UserOnly