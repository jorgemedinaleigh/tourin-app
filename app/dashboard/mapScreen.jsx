import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Pressable, StyleSheet, Alert, Text, Platform } from 'react-native'
import { MapView, Camera, PointAnnotation, ShapeSource, CircleLayer, Logger } from '@maplibre/maplibre-react-native'
import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, IconButton, Modal, Portal } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import * as Location from 'expo-location'
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
import { useUser } from '../../hooks/useUser'
import { useSiteVisits } from '../../hooks/useSiteVisits'
import {
  getDevLocationOverrideCoordinate,
  getDevLocationOverridePosition,
  isDevLocationOverrideEnabled,
} from '../../lib/devLocation'

const CAMERA_DEFAULT_SETTINGS = Object.freeze({ zoomLevel: 16 })
const FOLLOW_USER_ZOOM_LEVEL = 16
const USER_LOCATION_SOURCE_ID = 'user-location-source'
const USER_LOCATION_PULSE_LAYER_ID = 'user-location-pulse'
const USER_LOCATION_OUTER_LAYER_ID = 'user-location-outer'
const USER_LOCATION_INNER_LAYER_ID = 'user-location-inner'
const EXPO_LOCATION_OPTIONS = Object.freeze({
  accuracy: Location.Accuracy.High,
  timeInterval: 1_000,
  distanceInterval: 0,
})
const USER_LOCATION_PULSE_STYLE = Object.freeze({
  circleRadius: 15,
  circleColor: '#33B5E5',
  circleOpacity: 0.2,
  circlePitchAlignment: 'map',
})
const USER_LOCATION_OUTER_STYLE = Object.freeze({
  circleRadius: 9,
  circleColor: '#fff',
  circlePitchAlignment: 'map',
})
const USER_LOCATION_INNER_STYLE = Object.freeze({
  circleRadius: 6,
  circleColor: '#33B5E5',
  circlePitchAlignment: 'map',
})
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

function UserLocationMarker({ coordinate }) {
  const shape = useMemo(() => {
    if (!Array.isArray(coordinate) || coordinate.length !== 2) return null

    const [longitude, latitude] = coordinate
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        properties: {},
      }],
    }
  }, [coordinate])

  if (!shape) return null

  return (
    <ShapeSource id={USER_LOCATION_SOURCE_ID} shape={shape}>
      <CircleLayer id={USER_LOCATION_PULSE_LAYER_ID} style={USER_LOCATION_PULSE_STYLE} />
      <CircleLayer id={USER_LOCATION_OUTER_LAYER_ID} style={USER_LOCATION_OUTER_STYLE} />
      <CircleLayer id={USER_LOCATION_INNER_LAYER_ID} style={USER_LOCATION_INNER_STYLE} />
    </ShapeSource>
  )
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
  const { user } = useUser()
  const { visits, fetchVisits } = useSiteVisits(user?.$id)
  const insets = useSafeAreaInsets()
  const devLocationOverrideCoordinate = useMemo(() => getDevLocationOverrideCoordinate(), [])
  const hasDevLocationOverride = isDevLocationOverrideEnabled && Array.isArray(devLocationOverrideCoordinate)
  const [coord, setCoord] = useState(devLocationOverrideCoordinate)
  const [initialCameraCoordinate, setInitialCameraCoordinate] = useState(devLocationOverrideCoordinate)
  const [hasPreparedInitialCamera, setHasPreparedInitialCamera] = useState(hasDevLocationOverride)
  const [usesInitialCameraDefault, setUsesInitialCameraDefault] = useState(true)
  const [hasLocationPermission, setHasLocationPermission] = useState(hasDevLocationOverride)
  const [popup, setPopup] = useState(null)
  const [metroPopup, setMetroPopup] = useState(null)
  const [visible, setVisible] = useState(false)
  const cameraRef = useRef(null)
  const latestUserLocationRef = useRef(getDevLocationOverridePosition())
  const clearCameraStopTimeoutRef = useRef(null)

  const clearCameraStop = useCallback((delayMs = 0) => {
    if (clearCameraStopTimeoutRef.current) {
      clearTimeout(clearCameraStopTimeoutRef.current)
      clearCameraStopTimeoutRef.current = null
    }

    const clearStop = () => {
      clearCameraStopTimeoutRef.current = null
      cameraRef.current?.setCamera({
        animationDuration: 0,
        animationMode: 'moveTo',
      })
    }

    if (delayMs > 0) {
      clearCameraStopTimeoutRef.current = setTimeout(clearStop, delayMs)
      return
    }

    clearStop()
  }, [])

  useEffect(() => {
    return () => {
      if (clearCameraStopTimeoutRef.current) {
        clearTimeout(clearCameraStopTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    fetchVisits(user?.$id)
  }, [user?.$id])

  const visitedSiteIds = useMemo(
    () => new Set((visits ?? []).map((visit) => visit.siteId).filter(Boolean).map(String)),
    [visits]
  )

  const handleVisitStamped = useCallback(() => {
    fetchVisits(user?.$id)
  }, [user?.$id])

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

  const requestForegroundLocationPermission = async () => {
    if (hasDevLocationOverride) return true

    const permission = await Location.requestForegroundPermissionsAsync().catch(() => null)
    const granted = permission?.status === 'granted'
    setHasLocationPermission(granted)
    return granted
  }

  useEffect(() => {
    if (hasDevLocationOverride) return undefined

    let isActive = true

    const prepareInitialCamera = async () => {
      const granted = await requestForegroundLocationPermission()
      if (!isActive) return

      if (!granted) {
        setHasPreparedInitialCamera(true)
        return
      }

      const lastKnownPosition = await Location.getLastKnownPositionAsync().catch(() => null)
      const initialPosition = lastKnownPosition || await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }).catch(() => null)

      if (!isActive) return

      if (initialPosition && isValidCoordinate(initialPosition)) {
        latestUserLocationRef.current = initialPosition
        const initialCoord = toCoordinate(initialPosition)
        setCoord(initialCoord)
        setInitialCameraCoordinate(initialCoord)
      }

      setHasPreparedInitialCamera(true)
    }

    prepareInitialCamera()

    return () => {
      isActive = false
    }
  }, [])

  const ensureLocationPermission = async () => {
    return requestForegroundLocationPermission()
  }

  const handleUserLocationUpdate = (position) => {
    if (hasDevLocationOverride) return null

    latestUserLocationRef.current = position

    return updateUserCoord(position)
  }

  useEffect(() => {
    if (hasDevLocationOverride || !hasLocationPermission) return undefined

    let isActive = true
    let subscription = null

    const startLocationWatch = async () => {
      const lastKnownPosition = await Location.getLastKnownPositionAsync().catch(() => null)
      if (isActive && lastKnownPosition) {
        handleUserLocationUpdate(lastKnownPosition)
      }

      const nextSubscription = await Location.watchPositionAsync(
        EXPO_LOCATION_OPTIONS,
        handleUserLocationUpdate
      ).catch((error) => {
        console.log('Error watching location:', error?.message ?? error)
        return null
      })

      if (!nextSubscription) return

      if (!isActive) {
        nextSubscription.remove()
        return
      }

      subscription = nextSubscription

      if (!lastKnownPosition) {
        const currentPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }).catch(() => null)

        if (isActive && currentPosition) {
          handleUserLocationUpdate(currentPosition)
        }
      }
    }

    startLocationWatch()

    return () => {
      isActive = false
      subscription?.remove()
    }
  }, [hasDevLocationOverride, hasLocationPermission])

  const centerOnUser = async () => {
    const hasPermission = await ensureLocationPermission()
    if (!hasPermission) {
      Alert.alert(t('centerLocation.permissionTitle'), t('centerLocation.permissionBody'))
      return
    }

    let currentCoord = Array.isArray(coord) && coord.length === 2 ? coord : null
    if (!currentCoord && !hasDevLocationOverride) {
      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }).catch(() => null)
      currentCoord = handleUserLocationUpdate(currentPosition)
    }

    if (!currentCoord) {
      Alert.alert(t('centerLocation.locatingTitle'), t('centerLocation.locatingBody'))
      return
    }

    cameraRef.current?.setCamera({
      centerCoordinate: currentCoord,
      zoomLevel: FOLLOW_USER_ZOOM_LEVEL,
      animationDuration: 220,
    })
    clearCameraStop(350)

    posthog.capture('location_centered', {
      latitude: currentCoord[1],
      longitude: currentCoord[0],
      accuracy_m: latestUserLocationRef.current?.coords?.accuracy ?? null,
      used_cached_coordinate: false,
      used_dev_location_override: hasDevLocationOverride,
    })
  }

  const handleSitePress = useCallback((feature) => {
    clearCameraStop()

    const pointCoordinate = Array.isArray(feature.geometry?.coordinates)
      ? feature.geometry.coordinates
      : null
    const [lon, lat] = pointCoordinate || []
    const props = { ...(feature.properties || {}), pointCoordinate }

    setPopup({ props, lat, lon })
    setMetroPopup(null)

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
  }, [clearCameraStop])

  const handleMetroPress = useCallback((feature) => {
    clearCameraStop()

    const props = feature.properties || {}
    const [lon, lat] = feature.geometry?.coordinates || []

    setMetroPopup({ props, lat, lon })
    setPopup(null)
    posthog.capture('metro_info_viewed', {
      station_name: props.name,
      line: props.line,
    })

    showModal()
  }, [clearCameraStop])

  const handleMapLoaded = useCallback(() => {
    setUsesInitialCameraDefault(false)
  }, [])

  const shouldRenderUserLocation = !hasDevLocationOverride && (Platform.OS !== 'android' || hasLocationPermission)
  const cameraDefaultSettings = useMemo(() => {
    if (!usesInitialCameraDefault) return CAMERA_DEFAULT_SETTINGS

    const centerCoordinate = hasDevLocationOverride
      ? devLocationOverrideCoordinate
      : initialCameraCoordinate

    if (!Array.isArray(centerCoordinate) || centerCoordinate.length !== 2) return CAMERA_DEFAULT_SETTINGS

    return { ...CAMERA_DEFAULT_SETTINGS, centerCoordinate }
  }, [devLocationOverrideCoordinate, hasDevLocationOverride, initialCameraCoordinate, usesInitialCameraDefault])

  return (
    <GeoDataProvider>
      <ThemedView style={{ flex: 1 }} >
        {hasPreparedInitialCamera ? (
          <MapView
            style={ StyleSheet.absoluteFillObject }
            mapStyle={mapStyle}
            compassEnabled={true}
            logoEnabled={false}
            attributionEnabled={false}
            compassViewPosition={5}
            compassViewMargins={{ x: 15, y: insets.bottom + 40 }}
            onDidFinishLoadingMap={handleMapLoaded}
          >
            <Camera
              key={usesInitialCameraDefault ? 'initial-camera' : 'stable-camera'}
              ref={cameraRef}
              defaultSettings={cameraDefaultSettings}
              followUserLocation={false}
            />
            <StampRadiusLayer
              userCoordinate={coord}
              visitedSiteIds={visitedSiteIds}
            />
            <PointsLayer
              onPointPress={handleSitePress}
              visitedSiteIds={visitedSiteIds}
            />
            <MetroLayer onPointPress={handleMetroPress} />
            {hasDevLocationOverride ? (
              <PointAnnotation id="dev-location-override" coordinate={devLocationOverrideCoordinate}>
                <Ionicons name="radio-button-on" size={26} color="#2563eb" />
              </PointAnnotation>
            ) : null}
            {shouldRenderUserLocation ? (
              <UserLocationMarker coordinate={coord} />
            ) : null}
          </MapView>
        ) : (
          <ActivityIndicator animating={true} size={'large'} style={styles.mapLoading} />
        )}

        <IconButton
          mode="contained-tonal"
          icon="crosshairs-gps"
          iconColor="#e8e7ef"
          size={28}
          animated={true}
          style={styles.buttonFollow}
          onPress={centerOnUser}
          testID="toggle-follow-button"
        />
        
        <Portal>
          <Modal visible={visible} onDismiss={hideModal} style={{ padding: 20 }} >
            {metroPopup?.props ? (
              <MetroInfoCard info={metroPopup.props} onClose={hideModal} />
            ) : popup?.props ? (
              <InfoCard
                info={popup.props}
                onClose={hideModal}
                onVisitStamped={handleVisitStamped}
                userCoordinate={coord}
                hasLocationPermission={hasLocationPermission}
              />
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
  mapLoading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
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
