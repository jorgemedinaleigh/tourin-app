import * as Location from 'expo-location'
import { useEffect, useState, useRef } from 'react'
import { Pressable, StyleSheet, Alert, Text, Platform } from 'react-native'
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
import { posthog } from '../../lib/posthog'

const LAST_KNOWN_MAX_AGE_MS = 20_000
const LAST_KNOWN_REQUIRED_ACCURACY_M = 80
const TARGET_ACCURACY_M = 30
const TRACKING_ACCEPTABLE_ACCURACY_M = 120
const CURRENT_POSITION_TIMEOUT_MS = 12_000

function toCoordinate(position) {
  return [position.coords.longitude, position.coords.latitude]
}

function pickBetterPosition(currentBest, candidate) {
  if (!currentBest) return candidate
  if (!candidate) return currentBest

  const currentAccuracy = currentBest.coords?.accuracy ?? Number.POSITIVE_INFINITY
  const candidateAccuracy = candidate.coords?.accuracy ?? Number.POSITIVE_INFINITY
  return candidateAccuracy <= currentAccuracy ? candidate : currentBest
}

async function resolveBestUserPosition() {
  let best = await Location.getLastKnownPositionAsync({
    maxAge: LAST_KNOWN_MAX_AGE_MS,
    requiredAccuracy: LAST_KNOWN_REQUIRED_ACCURACY_M,
  })

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
      maximumAge: 0,
      timeout: CURRENT_POSITION_TIMEOUT_MS,
      mayShowUserSettingsDialog: true,
    })
    best = pickBetterPosition(best, current)

    if ((best?.coords?.accuracy ?? Number.POSITIVE_INFINITY) <= TARGET_ACCURACY_M) break
  }

  return best
}

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
    let isActive = true
    let subscription

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") return

      if (Platform.OS === 'android') {
        await Location.enableNetworkProviderAsync().catch(() => null)
      }

      try {
        const position = await resolveBestUserPosition()
        if (isActive && position) setCoord(toCoordinate(position))
      } catch {
        const fallback = await Location.getLastKnownPositionAsync()
        if (isActive && fallback) setCoord(toCoordinate(fallback))
      }

      let watcher
      try {
        watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 2_500,
            distanceInterval: 2,
            mayShowUserSettingsDialog: true,
          },
          (position) => {
            const accuracy = position.coords?.accuracy ?? Number.POSITIVE_INFINITY
            if (accuracy <= TRACKING_ACCEPTABLE_ACCURACY_M) {
              setCoord(toCoordinate(position))
            }
          }
        )
      } catch {
        return
      }

      if (!isActive) {
        watcher.remove()
        return
      }

      subscription = watcher
    })()

    return () => {
      isActive = false
      subscription?.remove?.()
    }
  }, [])

  const centerOnUser = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Activa el permiso de ubicación para centrar el mapa.")
      return
    }

    if (Platform.OS === 'android') {
      await Location.enableNetworkProviderAsync().catch(() => null)
    }

    let pos
    try {
      pos = await resolveBestUserPosition()
    } catch {
      pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 0,
        timeout: CURRENT_POSITION_TIMEOUT_MS,
      }).catch(() => null)
    }

    if (!pos) {
      Alert.alert("Ubicación no disponible", "No se pudo obtener una ubicación precisa en este momento.")
      return
    }

    const userCoord = toCoordinate(pos)
    setCoord(userCoord)

    cameraRef.current?.setCamera({
      centerCoordinate: userCoord,
      zoomLevel: 16,
      animationDuration: 600,
    })

    // Track location centering action
    posthog.capture('location_centered', {
      latitude: userCoord[1],
      longitude: userCoord[0],
      accuracy_m: pos.coords?.accuracy ?? null,
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
          compassViewPosition={5}
          compassViewMargins={{ x: 15, y: insets.bottom + 40 }}
        >
          <UserLocation visible />
          <Camera ref={cameraRef} zoomLevel={16} centerCoordinate={coord} />
          <PointsLayer
            onPointPress={(feature) => {
              const pointCoordinate = Array.isArray(feature.geometry?.coordinates)
                ? feature.geometry.coordinates
                : null
              const [lon, lat] = pointCoordinate || []
              const props = { ...(feature.properties || {}), pointCoordinate }
              setPopup({ props, lat, lon })
              setMetroPopup(null)
              cameraRef.current?.setCamera({
                centerCoordinate: [lon,lat],
                zoomLevel: 16,
                animationDuration: 600,
              })

              // Track site info viewed event
              posthog.capture('site_info_viewed', {
                site_id: props.id,
                site_name: props.name,
                site_type: props.type,
                site_subtype: props.subType,
                site_location: props.location,
                is_free: props.isFree,
                score: props.score,
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

              // Track metro info viewed event
              posthog.capture('metro_info_viewed', {
                station_name: props.name,
                line: props.line,
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
          testID="center-location-button"
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
