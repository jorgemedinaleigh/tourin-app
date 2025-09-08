import { Text } from 'react-native'
import ThemedView from '../../components/ThemedView'
import { useUser } from '../../hooks/useUser'
import { Button } from 'react-native-paper'

const perfil = () => {
  const { logout } = useUser()


  return (
    <ThemedView style={{ padding: 20 }} safe>
      <Text>Perfil</Text>
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