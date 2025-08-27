import { StyleSheet } from "react-native"
import ThemedView from "../../components/ThemedView"
import ThemedText from "../../components/ThemedText"

const mapa = () => {

  return (
    <ThemedView style={styles.container} safe>
      <ThemedText>Mapa</ThemedText>
    </ThemedView>
  )
}

export default mapa

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
})