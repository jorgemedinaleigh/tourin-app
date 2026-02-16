import * as Location from 'expo-location'
import { useEffect, useState, useRef } from 'react'
import { Pressable, StyleSheet, Alert, Text, Platform } from 'react-native'
import { MapView, Camera, ShapeSource, CircleLayer } from '@maplibre/maplibre-react-native'
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
const CURRENT_POSITION_TIMEOUT_MS = 12_000
const QUICK_CENTER_LAST_KNOWN_MAX_AGE_MS = 15_000
const QUICK_CENTER_REQUIRED_ACCURACY_M = 120
const QUICK_CENTER_TIMEOUT_MS = 5_000
const CAMERA_DEFAULT_SETTINGS = Object.freeze({ zoomLevel: 16 })
const CAMERA_PROGRAMMATIC_MOVE_WINDOW_MS = 1_500
const CAMERA_USER_INTERACTION_GRACE_MS = 1_200
const CAMERA_CENTER_EPSILON = 0.00001
const CAMERA_ZOOM_EPSILON = 0.01

function toCoordinate(position) {
  return [position.coords.longitude, position.coords.latitude]
}

function isValidCoordinate(position) {
  const latitude = position?.coords?.latitude
  const longitude = position?.coords?.longitude
  return Number.isFinite(latitude) && Number.isFinite(longitude)
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
  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [popup, setPopup] = useState(null)
  const [metroPopup, setMetroPopup] = useState(null)
  const [visible, setVisible] = useState(false)
  const cameraRef = useRef(null)
  const programmaticCameraUntilRef = useRef(Date.now() + 3_000)
  const lastUserInteractionAtRef = useRef(0)
  const lastStableViewportRef = useRef(null)
  const restoringViewportRef = useRef(false)
  const hasAutoCenteredRef = useRef(false)

  const showModal = () => setVisible(true)
  const hideModal = () => {
    setVisible(false)
    setPopup(null)
    setMetroPopup(null)
  }

  const updateUserCoord = (position) => {
    if (!isValidCoordinate(position)) return null

    const nextCoord = toCoordinate(position)
    setCoord(nextCoord)
    return nextCoord
  }

  // Only perform programmatic camera moves when explicitly forced or
  // when the map is following the user. This prevents unexpected
  // recentring triggered from other asynchronous flows.
  const setCameraSafely = (config, lockMs = CAMERA_PROGRAMMATIC_MOVE_WINDOW_MS, force = false) => {
    try {
      const stack = new Error().stack?.split('\n').slice(2,6).join('\n')
      console.debug('[mapScreen] setCameraSafely called', { config, at: Date.now(), force, stack })
    } catch (e) {
      // ignore
    }

    if (!force && !isFollowingUser) {
      console.debug('[mapScreen] setCameraSafely suppressed (not forced and not following user)')
      return
    }

    programmaticCameraUntilRef.current = Date.now() + lockMs
    cameraRef.current?.setCamera(config)
  }

  const saveViewport = (feature) => {
    const center = feature?.geometry?.coordinates
    if (!Array.isArray(center) || center.length !== 2) return

    const zoom = feature?.properties?.zoomLevel
    lastStableViewportRef.current = {
      center: [center[0], center[1]],
      zoom: Number.isFinite(zoom) ? zoom : null,
    }
  }

  const handleRegionIsChanging = (feature) => {
    if (feature?.properties?.isUserInteraction) {
      lastUserInteractionAtRef.current = Date.now()
      // Si el usuario interactúa con el mapa, desactivar seguimiento automático
      setIsFollowingUser(false)
    }
  }

  const handleRegionDidChange = (feature) => {
    const center = feature?.geometry?.coordinates
    if (!Array.isArray(center) || center.length !== 2) return

    const zoom = feature?.properties?.zoomLevel
    const isUserInteraction = Boolean(feature?.properties?.isUserInteraction)
    const now = Date.now()

    if (isUserInteraction) {
      lastUserInteractionAtRef.current = now
    }

    if (restoringViewportRef.current) {
      restoringViewportRef.current = false
      saveViewport(feature)
      return
    }

    const withinProgrammaticWindow = now <= programmaticCameraUntilRef.current
    const withinUserGrace = now - lastUserInteractionAtRef.current <= CAMERA_USER_INTERACTION_GRACE_MS

    if (isUserInteraction || withinProgrammaticWindow || withinUserGrace || !lastStableViewportRef.current) {
      saveViewport(feature)
      return
    }

    const last = lastStableViewportRef.current
    const movedCenter =
      Math.abs(last.center[0] - center[0]) > CAMERA_CENTER_EPSILON ||
      Math.abs(last.center[1] - center[1]) > CAMERA_CENTER_EPSILON
    const movedZoom =
      Number.isFinite(last.zoom) &&
      Number.isFinite(zoom) &&
      Math.abs(last.zoom - zoom) > CAMERA_ZOOM_EPSILON

    if (!movedCenter && !movedZoom) return
    // Evita recentrar automáticamente al mover la cámara desde el cliente.
    // En vez de forzar un restore, actualizamos el viewport estable para
    // respetar la interacción del usuario y evitar saltos inesperados.
    saveViewport(feature)
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
        if (isActive) {
          const userCoord = updateUserCoord(position)
          // Centrar automáticamente sólo la primera vez que se entra a la pantalla
          if (userCoord && !hasAutoCenteredRef.current) {
            setCameraSafely({ centerCoordinate: userCoord, animationDuration: 350 }, 700, true)
            hasAutoCenteredRef.current = true
          }
        }
      } catch {
        const fallback = await Location.getLastKnownPositionAsync()
        if (isActive) {
          const userCoord = updateUserCoord(fallback)
          if (userCoord && !hasAutoCenteredRef.current) {
            setCameraSafely({ centerCoordinate: userCoord, animationDuration: 350 }, 700, true)
            hasAutoCenteredRef.current = true
          }
        }
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
            updateUserCoord(position)
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

  const centerOnUser = async (followAfterCenter = false) => {
    const immediateCoord = Array.isArray(coord) && coord.length === 2 ? coord : null
    if (immediateCoord) {
      setCameraSafely({
        centerCoordinate: immediateCoord,
        animationDuration: 220,
      }, 700, true)
    }

    const permission = await Location.getForegroundPermissionsAsync()
    let permissionStatus = permission.status
    if (permissionStatus !== "granted") {
      const requested = await Location.requestForegroundPermissionsAsync()
      permissionStatus = requested.status
    }

    if (permissionStatus !== "granted") {
      if (!immediateCoord) {
        Alert.alert("Permiso requerido", "Activa el permiso de ubicación para centrar el mapa.")
      }
      return
    }

    if (Platform.OS === 'android') {
      Location.enableNetworkProviderAsync().catch(() => null)
    }

    let pos = await Location.getLastKnownPositionAsync({
      maxAge: QUICK_CENTER_LAST_KNOWN_MAX_AGE_MS,
      requiredAccuracy: QUICK_CENTER_REQUIRED_ACCURACY_M,
    }).catch(() => null)

    if (!pos) {
      pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: QUICK_CENTER_LAST_KNOWN_MAX_AGE_MS,
        timeout: QUICK_CENTER_TIMEOUT_MS,
        mayShowUserSettingsDialog: true,
      }).catch(() => null)
    }

    if (!pos) {
      if (!immediateCoord) {
        Alert.alert("Ubicación no disponible", "No se pudo obtener una ubicación precisa en este momento.")
      }
      return
    }

    const userCoord = updateUserCoord(pos) ?? toCoordinate(pos)
    if (!immediateCoord) {
      setCameraSafely({
        centerCoordinate: userCoord,
        animationDuration: 350,
      }, 700, true)
    }

    if (followAfterCenter) {
      setIsFollowingUser(true)
    }

    // Track location centering action
    posthog.capture('location_centered', {
      latitude: userCoord[1],
      longitude: userCoord[0],
      accuracy_m: pos.coords?.accuracy ?? null,
      used_cached_coordinate: Boolean(immediateCoord),
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
          onRegionIsChanging={handleRegionIsChanging}
          onRegionDidChange={handleRegionDidChange}
          regionDidChangeDebounceTime={120}
        >
          <Camera
            ref={cameraRef}
            defaultSettings={CAMERA_DEFAULT_SETTINGS}
            followUserLocation={isFollowingUser}
          />
          <PointsLayer
            onPointPress={(feature) => {
              const pointCoordinate = Array.isArray(feature.geometry?.coordinates)
                ? feature.geometry.coordinates
                : null
              const [lon, lat] = pointCoordinate || []
              const props = { ...(feature.properties || {}), pointCoordinate }
              setPopup({ props, lat, lon })
              setMetroPopup(null)
                        setCameraSafely({
                          centerCoordinate: [lon,lat],
                          zoomLevel: 16,
                          animationDuration: 600,
                        }, undefined, true)

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
              setCameraSafely({
                centerCoordinate: [lon, lat],
                zoomLevel: 16,
                animationDuration: 600,
              }, undefined, true)

              // Track metro info viewed event
              posthog.capture('metro_info_viewed', {
                station_name: props.name,
                line: props.line,
              })

              showModal()
            }}
          />
          {coord ? (
            <ShapeSource
              id="user-location-source"
              shape={{
                type: 'Feature',
                geometry: { type: 'Point', coordinates: coord },
                properties: {},
              }}
            >
              <CircleLayer
                id="user-location-halo"
                style={{
                  circleRadius: 16,
                  circleColor: 'rgba(34, 197, 94, 0.20)',
                }}
              />
              <CircleLayer
                id="user-location-dot"
                style={{
                  circleRadius: 7,
                  circleColor: '#22c55e',
                  circleStrokeWidth: 2,
                  circleStrokeColor: '#ffffff',
                }}
              />
            </ShapeSource>
          ) : null}
        </MapView>

        <IconButton
          mode="contained-tonal"
          icon={isFollowingUser ? "target" : "crosshairs-gps"}
          iconColor={isFollowingUser ? "#22c55e" : "#e8e7ef"}
          size={28}
          animated={true}
          style={styles.buttonFollow}
          onPress={() => {
            if (isFollowingUser) {
              setIsFollowingUser(false)
            } else {
              centerOnUser(true)
            }
          }}
          testID="toggle-follow-button"
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
  buttonFollow: {
    position: "absolute",
    right: 10,
    bottom: 60,
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
