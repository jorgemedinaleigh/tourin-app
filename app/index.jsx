import { Image, StyleSheet } from 'react-native'
import { Link } from 'expo-router'
import ThemedText from '../components/ThemedText'
import ThemedView from '../components/ThemedView'

const index = () => {
  return (
    <ThemedView style={styles.container}>
      <Image source={require('../assets/dolmen-icon.jpeg')} style={styles.logo} />
      <ThemedText style={styles.title} title={true}>Tourin App</ThemedText>
      <Link href="dashboard/mapa" style={styles.link}><ThemedText>Mapa</ThemedText></Link>
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