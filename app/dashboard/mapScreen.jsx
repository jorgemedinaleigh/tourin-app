import { useEffect, useState, useRef } from 'react'
import { Pressable, StyleSheet, Alert, Text, Platform } from 'react-native'
import { MapView, Camera, UserLocation, PointAnnotation, requestAndroidLocationPermissions, Logger } from '@maplibre/maplibre-react-native'
import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, IconButton, Modal, Portal } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { GeoDataProvider, useGeoData } from '../../contexts/GeoDataContext'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import mapStyle from '../../constants/positronTourin.json'
import ThemedView from '../../components/ThemedView'
import PointsLayer from '../../components/PointsLayer'
import StampRadiusLayer from '../../components/StampRadiusLayer'
import InfoCard from '../../components/InfoCard'
import MetroLayer from '../../components/MetroLayer'
import MetroInfoCard from '../../components/MetroInfoCard'
import { posthog } from '../../lib/posthog'
import {
  getDevLocationOverrideCoordinate,
  getDevLocationOverridePosition,
  isDevLocationOverrideEnabled,
} from '../../lib/devLocation'

const CAMERA_DEFAULT_SETTINGS = Object.freeze({ zoomLevel: 16 })
const CAMERA_PROGRAMMATIC_MOVE_WINDOW_MS = 1_500
const CAMERA_USER_INTERACTION_GRACE_MS = 1_200
const CAMERA_CENTER_EPSILON = 0.00001
const CAMERA_ZOOM_EPSILON = 0.01
const USER_LOCATION_MIN_DISPLACEMENT_M = 2
const LAST_LOCATION_UNAVAILABLE_LOG = Object.freeze({
  tag: 'Mbgl-LocationComponent',
  message: 'Failed to obtain last location update',
})

Logger.setLogCallback((log) => {
  if (
    Platform.OS === 'android' &&
    log.tag === LAST_LOCATION_UNAVAILABLE_LOG.tag &&
    log.message === LAST_LOCATION_UNAVAILABLE_LOG.message
  ) {
    return true
  }

  return false
})

function toCoordinate(position) {
  return [position.coords.longitude, position.coords.latitude]
}

function isValidCoordinate(position) {
  const latitude = position?.coords?.latitude
  const longitude = position?.coords?.longitude
  return Number.isFinite(latitude) && Number.isFinite(longitude)
}

function GeoDataStatus() {
  const { loading, error, refresh } = useGeoData()
  const { t } = useTranslation('map')

  if (!loading && !error) return null

  if (loading) return (<ActivityIndicator animating={true} size={'large'} />)

  return (
    <Pressable onPress={refresh} style={styles.toast}>
      <Ionicons name="warning" size={16} color="#fff" />
      <Text style={{ color: "#fff" }}>{t('geoStatus.retry')}</Text>
    </Pressable>
  )
}

const MapScreen = () => {
  const { t } = useTranslation('map')
  const insets = useSafeAreaInsets()
  const devLocationOverrideCoordinate = getDevLocationOverrideCoordinate()
  const hasDevLocationOverride = isDevLocationOverrideEnabled && Array.isArray(devLocationOverrideCoordinate)
  const [coord, setCoord] = useState(devLocationOverrideCoordinate)
  const [hasLocationPermission, setHasLocationPermission] = useState(hasDevLocationOverride || Platform.OS !== 'android')
  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [popup, setPopup] = useState(null)
  const [metroPopup, setMetroPopup] = useState(null)
  const [visible, setVisible] = useState(false)
  const cameraRef = useRef(null)
  const latestUserLocationRef = useRef(getDevLocationOverridePosition())
  const programmaticCameraUntilRef = useRef(Date.now() + 3_000)
  const lastUserInteractionAtRef = useRef(0)
  const lastStableViewportRef = useRef(null)
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
    if (!force && !isFollowingUser) return

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
    if (hasDevLocationOverride || Platform.OS !== 'android') return undefined

    let isActive = true

    const requestPermission = async () => {
      const granted = await requestAndroidLocationPermissions().catch(() => false)
      if (isActive) {
        setHasLocationPermission(granted)
      }
    }

    requestPermission()

    return () => {
      isActive = false
    }
  }, [])

  const ensureLocationPermission = async () => {
    if (hasDevLocationOverride || Platform.OS !== 'android') return true

    const granted = await requestAndroidLocationPermissions().catch(() => false)
    setHasLocationPermission(granted)
    return granted
  }

  const handleUserLocationUpdate = (position) => {
    if (hasDevLocationOverride) return

    latestUserLocationRef.current = position

    const userCoord = updateUserCoord(position)
    if (!userCoord || hasAutoCenteredRef.current) return

    setCameraSafely({ centerCoordinate: userCoord, animationDuration: 350 }, 700, true)
    hasAutoCenteredRef.current = true
  }

  const centerOnUser = async (followAfterCenter = false) => {
    const hasPermission = await ensureLocationPermission()
    if (!hasPermission) {
      Alert.alert(t('centerLocation.permissionTitle'), t('centerLocation.permissionBody'))
      return
    }

    const currentCoord = Array.isArray(coord) && coord.length === 2 ? coord : null
    if (!currentCoord) {
      Alert.alert(t('centerLocation.locatingTitle'), t('centerLocation.locatingBody'))
      return
    }

    if (followAfterCenter) {
      setIsFollowingUser(true)
    }

    setCameraSafely({
      centerCoordinate: currentCoord,
      animationDuration: 220,
    }, 700, true)

    posthog.capture('location_centered', {
      latitude: currentCoord[1],
      longitude: currentCoord[0],
      accuracy_m: latestUserLocationRef.current?.coords?.accuracy ?? null,
      used_cached_coordinate: false,
      used_dev_location_override: hasDevLocationOverride,
    })
  }

  const shouldRenderUserLocation = !hasDevLocationOverride && (Platform.OS !== 'android' || hasLocationPermission)
  const cameraDefaultSettings = hasDevLocationOverride
    ? { ...CAMERA_DEFAULT_SETTINGS, centerCoordinate: devLocationOverrideCoordinate }
    : CAMERA_DEFAULT_SETTINGS

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
            defaultSettings={cameraDefaultSettings}
            followUserLocation={!hasDevLocationOverride && isFollowingUser}
          />
          <StampRadiusLayer userCoordinate={coord} />
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
                centerCoordinate: [lon, lat],
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
          {hasDevLocationOverride ? (
            <PointAnnotation id="dev-location-override" coordinate={devLocationOverrideCoordinate}>
              <Ionicons name="radio-button-on" size={26} color="#2563eb" />
            </PointAnnotation>
          ) : null}
          {shouldRenderUserLocation ? (
            <UserLocation
              renderMode="normal"
              showsUserHeadingIndicator={true}
              minDisplacement={USER_LOCATION_MIN_DISPLACEMENT_M}
              onUpdate={handleUserLocationUpdate}
            />
          ) : null}
        </MapView>

        <IconButton
          mode="contained-tonal"
          icon={!hasDevLocationOverride && isFollowingUser ? "target" : "crosshairs-gps"}
          iconColor={!hasDevLocationOverride && isFollowingUser ? "#22c55e" : "#e8e7ef"}
          size={28}
          animated={true}
          style={styles.buttonFollow}
          onPress={() => {
            if (hasDevLocationOverride) {
              centerOnUser(false)
            } else if (isFollowingUser) {
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

export default MapScreen

const styles = StyleSheet.create({
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
