import { useRef, useEffect, useState } from "react"
import { View, StyleSheet, Text, Pressable, ActivityIndicator, Platform } from "react-native"
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps"
import * as Location from "expo-location"
import ThemedView from "../../components/ThemedView"

const mapa = () => {

  const mapRef = useRef(null)
  const [hasPermission, setHasPermission] = useState(null)
  const [locating, setLocating] = useState(false)

  const initialRegion = {
    latitude: -33.4489,
    longitude: -70.6693,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      setHasPermission(status === "granted")

      if (Platform.OS === "android") {
        const enabled = await Location.hasServicesEnabledAsync();
        setServicesOn(enabled);
        if (!enabled) {
          try { await Location.enableNetworkProviderAsync(); } catch {}
        }
      }
    })()
  }, [])

  const centerOnUser = async () => {
    try {
      setLocating(true)
      const pos = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true
      })
      mapRef.current?.animateToRegion({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 600)
    }
    catch (e) {
      Alert.alert("No se pudo obtener tu ubicación", String(e?.message ?? e));
    } 
    finally {
      setLocating(false)
    }
  }

  return (
    <ThemedView style={styles.container} safe>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_DEFAULT : undefined}
        initialRegion={initialRegion}
        showsUserLocation={hasPermission}
        mapType="standard"
      >
        <Marker coordinate={{ latitude: -33.4489, longitude: -70.6693 }} title="Santiago" />
      </MapView>

      <View style={styles.fabContainer}>
        <Pressable style={styles.fab} onPress={centerOnUser}>
          {locating ? <ActivityIndicator /> : <Text style={styles.fabText}>Mi ubicación</Text>}
        </Pressable>
      </View>
    </ThemedView>
  )
}

export default mapa

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  fabContainer: { 
    position: "absolute", 
    right: 16, 
    bottom: 24 
  },
  fab: { 
    backgroundColor: "#111827", 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    borderRadius: 24, 
    elevation: 3 
  },
  fabText: { 
    color: "#fff", 
    fontWeight: "600" 
  },
})