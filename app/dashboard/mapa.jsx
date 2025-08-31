import * as Location from "expo-location"
import { useEffect, useState, useRef } from "react"
import { Pressable, StyleSheet, Alert } from "react-native"
import { MapView, Camera, UserLocation } from "@maplibre/maplibre-react-native"
import { Ionicons } from '@expo/vector-icons'
import { GeoDataProvider, useGeoData } from "../../contexts/GeoDataContext"
import ThemedView from "../../components/ThemedView"
import PointsLayer from "../../components/PointsLayer"
import mapStyle from "../../constants/positronTourin.json"

function GeoDataStatus() {
  const { loading, error, refresh } = useGeoData()
  if (!loading && !error) return null

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <Pressable onPress={refresh} style={styles.toast}>
      <Ionicons name="warning" size={16} color="#fff" />
      <Text style={{ color: "#fff" }}>Reintentar</Text>
    </Pressable>
  )
}

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
    <GeoDataProvider>
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
        <PointsLayer
          cameraRef={cameraRef}
          onPointPress={(feature) => {
            const props = feature.properties || {}
            const [lng, lat] = feature.geometry?.coordinates || []
            Alert.alert(
              props?.title ?? "Punto",
              `${props?.subtitle ?? ""}\n(${lat?.toFixed?.(5)}, ${lng?.toFixed?.(5)})`
            )
          }}
        />
        <GeoDataStatus />
        <Pressable onPress={centerOnUser} hitSlop={10} style={styles.button} >
          <Ionicons size={25} name="locate" color="#201e2b" />
        </Pressable>
      </ThemedView>
    </GeoDataProvider>
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
  loading: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    padding: 8,
  },
  toast: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(239,68,68,0.9)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
})