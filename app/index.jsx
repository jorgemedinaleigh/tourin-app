import { useRouter } from 'expo-router'
import { Image, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { useUser } from '../hooks/useUser'
import LoadingScreen from '../components/LoadingScreen'
import ThemedView from '../components/ThemedView'

const Index = () => {
  const { user, authChecked } = useUser()
  const router = useRouter()

  const handleEnter = () => {
    if (user) {
      router.replace('dashboard/mapScreen')
      return
    }

    router.replace('auth/loginScreen')
  }

  if (!authChecked) {
    return <LoadingScreen />
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Text variant="displaySmall" style={styles.title}>¡Bienvenido a TourIn!</Text>
        <Image source={require('../assets/tourin_icon.png')} style={styles.logo} />
        <Text variant="displaySmall" style={styles.body}>La app que te acompañará en tu experiencia turística</Text>
      </View>
      <Button mode="contained" style={styles.button} onPress={handleEnter}>
        Entrar
      </Button>
    </ThemedView>
  )
}

export default Index

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 250,
    height: 250,
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  body: {
    fontWeight: '200',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  button: {
    marginTop: 28,
    alignSelf: 'stretch',
  },
})
