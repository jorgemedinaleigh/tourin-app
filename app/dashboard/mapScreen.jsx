import * as Location from 'expo-location'
import { useEffect, useState, useRef } from 'react'
import { Pressable, StyleSheet, Alert, Text } from 'react-native'
import { MapView, Camera, UserLocation } from '@maplibre/maplibre-react-native'
import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, IconButton, Modal, Portal } from 'react-native-paper'
import { GeoDataProvider, useGeoData } from '../../contexts/GeoDataContext'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import mapStyle from '../../constants/positronTourin.json'
import ThemedView from '../../components/ThemedView'
import PointsLayer from '../../components/PointsLayer'
import InfoCard from '../../components/InfoCard'
import MetroLayer from '../../components/MetroLayer'
import MetroInfoCard from '../../components/MetroInfoCard'

function GeoDataStatus() {
  const { loading, error, refresh } = useGeoData()

  if (!loading && !error) return null

  if (loading) return (<ActivityIndicator animating={true} size={'large'} />)

  return (
    <Pressable onPress={refresh} style={styles.toast}>
      <Ionicons name="warning" size={16} color="#fff" />
      <Text style={{ color: "#fff" }}>Reintentar</Text>
    </Pressable>
  )
}

const mapScreen = () => {
  const insets = useSafeAreaInsets()
  const [coord, setCoord] = useState(null)
  const [popup, setPopup] = useState(null)
  const [metroPopup, setMetroPopup] = useState(null)
  const [visible, setVisible] = useState(false)
  const cameraRef = useRef(null)
  
  const showModal = () => setVisible(true)
  const hideModal = () => {
    setVisible(false)
    setPopup(null)
    setMetroPopup(null)
  }

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
      <ThemedView style={{ flex: 1 }} >
        <MapView 
          style={ StyleSheet.absoluteFillObject } 
          mapStyle={mapStyle}
          compassEnabled={true}
          logoEnabled={false}
          attributionEnabled={false}
          compassViewPosition={3}
          compassViewMargins={{ x: 15, y: insets.bottom + 40 }}
        >
          <UserLocation visible />
          <Camera ref={cameraRef} zoomLevel={16} centerCoordinate={coord} />
          <PointsLayer
            onPointPress={(feature) => {
              const props = feature.properties || {}
              const [lon, lat] = feature.geometry?.coordinates || []
              setPopup({ props, lat, lon })
              setMetroPopup(null)
              cameraRef.current?.setCamera({
                centerCoordinate: [lon,lat],
                zoomLevel: 16,
                animationDuration: 600,
              })
              showModal()
            }}
          />
          <MetroLayer
            onPointPress={(feature) => {
              const props = feature.properties || {}
              const [lon, lat] = feature.geometry?.coordinates || []
              setMetroPopup({ props, lat, lon })
              setPopup(null)
              cameraRef.current?.setCamera({
                centerCoordinate: [lon, lat],
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
          iconColor="#e8e7ef"
          size={30}
          animated={true}
          style={styles.button}
          onPress={centerOnUser} 
        />

        <Portal>
          <Modal visible={visible} onDismiss={hideModal} style={{ padding: 20 }} >
            {metroPopup?.props ? (
              <MetroInfoCard info={metroPopup.props} onClose={hideModal} />
            ) : popup?.props ? (
              <InfoCard info={popup.props} onClose={hideModal} />
            ) : null}
          </Modal>
        </Portal>
      
        <GeoDataStatus />
        
      </ThemedView>
    </GeoDataProvider>
  )
}

export default mapScreen

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 10,
    bottom: 5,
    backgroundColor: "#000",
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
