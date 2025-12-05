import { useRouter } from "expo-router"
import { useUser } from "../../hooks/useUser"
import { useEffect } from "react"
import LoadingScreen from "../LoadingScreen"

const GuestOnly = ({ children }) => {
  const { user, authChecked } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (authChecked && user !== null) {
      router.replace('dashboard/mapScreen')
    }
  }, [user, authChecked])

  if (!authChecked || user) {
    return <LoadingScreen />
  }
  return children
}

export default GuestOnly
