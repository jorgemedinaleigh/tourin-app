import * as Location from "expo-location"
import { useEffect, useState, useRef } from "react"
import { Pressable, StyleSheet, Alert, Text } from "react-native"
import { MapView, Camera, UserLocation } from "@maplibre/maplibre-react-native"
import { Ionicons } from '@expo/vector-icons'
import { IconButton, Modal, PaperProvider, Portal } from "react-native-paper"
import { GeoDataProvider, useGeoData } from "../../contexts/GeoDataContext"
import mapStyle from "../../constants/positronTourin.json"
import ThemedView from "../../components/ThemedView"
import PointsLayer from "../../components/PointsLayer"
import ThemedSpinner from "../../components/ThemedSpinner"
import InfoCard from "../../components/InfoCard"

function GeoDataStatus() {
  const { loading, error, refresh } = useGeoData()
  if (!loading && !error) return null

  if (loading) return (<ThemedSpinner />)

  return (
    <Pressable onPress={refresh} style={styles.toast}>
      <Ionicons name="warning" size={16} color="#fff" />
      <Text style={{ color: "#fff" }}>Reintentar</Text>
    </Pressable>
  )
}

const mapa = () => {

  const [coord, setCoord] = useState(null)
  const [popup, setPopup] = useState(null)
  const [visible, setVisible] = useState(false)
  const cameraRef = useRef(null)
  
  const showModal = () => setVisible(true)
  const hideModal = () => setVisible(false)

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
    <PaperProvider>
      <GeoDataProvider>
        <ThemedView style={{ flex: 1 }} safe>
          <MapView style={ StyleSheet.absoluteFillObject } mapStyle={mapStyle}>

            <UserLocation visible />
            <Camera ref={cameraRef} zoomLevel={16} centerCoordinate={coord} />

            <PointsLayer
              onPointPress={(feature) => {
                const props = feature.properties || {}
                const [lon, lat] = feature.geometry?.coordinates || []
                setPopup({props, lat, lon})
                cameraRef.current?.setCamera({
                  centerCoordinate: [lon,lat],
                  zoomLevel: 16,
                  animationDuration: 600,
                })
                showModal()
              }}
            />
          </MapView>
          
          <IconButton 
            mode="contained-tonal" 
            icon="crosshairs-gps" 
            iconColor="#000"
            size={30}
            animated={true}
            style={styles.button}
            onPress={centerOnUser} 
          />

          <Portal>
            <Modal visible={visible} onDismiss={hideModal} style={{ padding: 20 }} >
              <InfoCard info={popup?.props} onClose={hideModal}/>
            </Modal>
          </Portal>
        
          <GeoDataStatus />
        </ThemedView>
      </GeoDataProvider>
    </PaperProvider>
  )
}

export default mapa

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 10,
    bottom: 5,
    backgroundColor: "#e8e7ef",
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