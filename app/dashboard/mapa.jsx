import * as Location from "expo-location"
import { useEffect, useState, useRef } from "react"
import { Pressable, StyleSheet, Alert } from "react-native"
import { MapView, Camera, UserLocation } from "@maplibre/maplibre-react-native"
import { Ionicons } from '@expo/vector-icons'
import ThemedView from "../../components/ThemedView"
import mapStyle from "../../constants/positronTourin.json"

const mapa = () => {

  const [coord, setCoord] = useState(null)
  const cameraRef = useRef(null)

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === "granted") {
        const last = await Location.getLastKnownPositionAsync()
        if (last) setCoord([last.coords.longitude, last.coords.latitude])
      }
    })()
  }, [])

  const centerOnUser = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Activa el permiso de ubicación para centrar el mapa.")
      return
    }

    let pos = await Location.getLastKnownPositionAsync()
    if (!pos) pos = await Location.getCurrentPositionAsync({})
    const userCoord = [pos.coords.longitude, pos.coords.latitude]

    cameraRef.current?.setCamera({
      centerCoordinate: userCoord,
      zoomLevel: 16,
      animationDuration: 600,
    })
  }

  return (
    <ThemedView style={{ flex: 1 }} safe>
      <MapView 
        style={{ flex: 1 }}
        mapStyle={mapStyle}
        onMapReady={() => console.log("Map is ready")}
        onDidFinishLoadingStyle={() => console.log("Style loaded")}
      >
        <UserLocation visible />
        <Camera ref={cameraRef} zoomLevel={16} centerCoordinate={coord} />
      </MapView>
      <Pressable onPress={centerOnUser} hitSlop={5} style={styles.button} >
        <Ionicons size={25} name="locate" color="#201e2b" />
      </Pressable>
    </ThemedView>
  )
}

export default mapa

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 16,
    bottom: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 4,
    backgroundColor: "#e8e7ef",
  },
})