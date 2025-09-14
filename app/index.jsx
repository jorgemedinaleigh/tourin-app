import { Image, StyleSheet, Text } from 'react-native'
import { Link } from 'expo-router'
import ThemedView from '../components/ThemedView'

const index = () => {
  return (
    <ThemedView style={styles.container} >
      <Image source={require('../assets/dolmen-icon.jpeg')} style={styles.logo} />
      <Text style={styles.title} >Tourin App</Text>
      <Link href="dashboard/mapScreen" style={styles.link} >Mapa</Link>
      <Link href="dashboard/profileScreen" style={styles.link} >Perfil</Link>
      <Link href="auth/loginScreen" style={styles.link} >Login</Link>
      <Link href="auth/registerScreen" style={styles.link} >Register</Link>
    </ThemedView>
  )
}

export default index

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 40
  },
  link: {
    marginVertical: 10,
    borderBottomWidth: 1,
    fontSize: 20
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 10,
    marginVertical: 20
  }
})