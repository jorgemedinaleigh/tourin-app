import { Redirect } from 'expo-router'
import { useUser } from '../hooks/useUser'
import LoadingScreen from '../components/LoadingScreen'

const Index = () => {
  const { user, authChecked } = useUser()

  if (!authChecked) {
    return <LoadingScreen />
  }

  if (user) {
    return <Redirect href="/dashboard/mapScreen" />
  }

  return <Redirect href="/auth/loginScreen" />
}

export default Index
