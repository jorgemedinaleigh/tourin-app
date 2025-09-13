import { Text } from 'react-native'
import { Button } from 'react-native-paper'
import { useUser } from '../../hooks/useUser'
import ThemedView from '../../components/ThemedView'

const perfil = () => {
  const { logout, user } = useUser()

  return (
    <ThemedView style={{ padding: 20 }} safe>
      <Text>Perfil</Text>
      <Text>{user.name}</Text>
      <Text>{user.email}</Text>
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

export default perfil