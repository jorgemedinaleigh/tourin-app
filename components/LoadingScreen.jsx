import { ActivityIndicator, Image, StyleSheet, View } from 'react-native'

const LoadingScreen = () => {
  return (
    <View style={styles.container}>
      <Image source={require('../assets/dolmen-icon.jpeg')} style={styles.logo} />
      <ActivityIndicator size="large" color="#6849a7" />
    </View>
  )
}

export default LoadingScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 12,
    marginBottom: 24,
  },
})
