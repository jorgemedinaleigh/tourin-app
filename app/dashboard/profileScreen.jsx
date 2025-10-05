import { Text } from 'react-native'
import { Button } from 'react-native-paper'
import { useUser } from '../../hooks/useUser'
import { useStats } from '../../hooks/useStats'
import ThemedView from '../../components/ThemedView'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'

const profileScreen = () => {
  const { logout, user } = useUser()
  const { stats, getStats } = useStats(user.$id)

  useFocusEffect(
    useCallback(() => {
      if(user?.$id) {
        getStats()
      }
    }, [user?.$id])
  )

  return (
    <ThemedView style={{ padding: 20 }} safe>
      <Text>Perfil</Text>
      <Text>{user.name}</Text>
      <Text>{user.email}</Text>
      <Text>Puntaje: {stats?.score ?? 0}</Text>
      <Text>Sitios: {stats?.sitesVisited ?? 0}</Text>
      <Text>Eventos: {stats?.eventsAttended ?? 0}</Text>

      <Button 
        mode="contained-tonal" 
        icon={"logout"}
        buttonColor="#ff2c2cff" 
        textColor="#ffffffff"
        onPress={logout}
      >
        Desconectar Cuenta
      </Button>
    </ThemedView>
  )
}

export default profileScreen