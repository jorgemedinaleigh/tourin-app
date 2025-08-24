import { StyleSheet } from 'react-native'
import { Link } from 'expo-router'
import ThemedText from '../components/ThemedText'
import ThemedView from '../components/ThemedView'

const index = () => {
  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title} title={true}>Tourin App</ThemedText>
      <Link href="dashboard/mapa" style={styles.link}>Mapa</Link>
    </ThemedView>
  )
}

export default index

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontWeight: 'bold',
    fontSize: 40
  },
  link: {
    marginVertical: 10,
    borderBottomWidth: 1
  }
})