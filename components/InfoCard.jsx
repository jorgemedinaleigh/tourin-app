import { Alert, Text, View, StyleSheet, useWindowDimensions, Image, ScrollView, Linking } from 'react-native'
import { Button, Card, Chip, IconButton, Portal, useTheme } from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { useUser } from '../hooks/useUser'
import { useSiteVisits } from '../hooks/useSiteVisits'
import { useEffect, useMemo, useState } from 'react'
import { useStats } from '../hooks/useStats'
import { useRouter } from 'expo-router'
import StampImpactOverlay from './StampImpactOverlay'
import * as Location from 'expo-location'
import { posthog } from '../lib/posthog'

const pickUri = (candidate) => {
  if (!candidate) return null
  if (typeof candidate === 'string' && candidate.trim().length) return candidate
  if (Array.isArray(candidate)) {
    for (const item of candidate) {
      const uri = pickUri(item)
      if (uri) return uri
    }
  }
  if (typeof candidate === 'object') {
    const uriLike =
      candidate.url ||
      candidate.href ||
      candidate.uri ||
      candidate.link ||
      candidate.$url ||
      candidate.$href ||
      candidate.$uri
    if (uriLike && typeof uriLike === 'string' && uriLike.trim().length) return uriLike
  }
  return null
}

const findUri = (candidates) => {
  for (const candidate of candidates) {
    const uri = pickUri(candidate)
    if (uri) return uri
  }
  return null
}

const toRadians = (value) => (value * Math.PI) / 180

const getDistanceMeters = (fromLat, fromLon, toLat, toLon) => {
  const earthRadius = 6371000
  const dLat = toRadians(toLat - fromLat)
  const dLon = toRadians(toLon - fromLon)
  const lat1 = toRadians(fromLat)
  const lat2 = toRadians(toLat)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadius * c
}

function InfoCard({ info, onClose }) {
  const theme = useTheme()
  const { height } = useWindowDimensions()
  const { user } = useUser()
  const { getVisit, stampVisit, fetchVisits } = useSiteVisits(user.$id)
  const { addPoints, siteVisited, getStats } = useStats(user.$id)
  const router = useRouter()

  const [isVisited, setIsVisited] = useState(false)
  const [stamping, setStamping] = useState(false)
  const [showStampOverlay, setShowStampOverlay] = useState(false)
  const [overlayDismissible, setOverlayDismissible] = useState(false)
  const cardMaxHeight = height * 0.9

  const stampUri = useMemo(() => {
    if (!info) return null
    const candidates = [
      info?.stamp,
      info?.stampUrl,
      info?.stamp_uri,
      info?.stampHref,
      info?.image,
      info?.imageUrl,
      info?.photoUrl,
      info?.properties?.stamp,
      info?.site?.stamp,
      info?.media,
      info?.image?.url,
      info?.image?.href,
      info?.image?.uri,
      info?.Stamp,
      info?.STAMPS,
    ]

    const uri = findUri(candidates)
    if (uri) return uri

    return null
  }, [info])

  const coverUri = useMemo(() => {
    if (!info) return null
    return findUri([
      info?.coverPhoto,
      info?.properties?.coverPhoto,
      info?.cover_photo,
      info?.coverUrl,
      info?.cover,
      info?.image,
      info?.imageUrl,
      info?.photoUrl,
      info?.media,
    ])
  }, [info])

  const websiteUrl = useMemo(() => {
    if (!info) return null
    const raw = info.website ?? info?.properties?.website
    if (typeof raw !== 'string') return null
    const trimmed = raw.trim()
    if (!trimmed.length) return null
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }, [info])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setIsVisited(false)
      try {
        const v = await getVisit(user.$id, info.id)
        if(alive) {
          setIsVisited(!!v)
        }
      } catch (err) {
        console.error('Error fetching visits:', err)
        if(alive) {
          setIsVisited(false)
        }
      }
    })()
    return () => { alive = false }
  }, [user?.$id, info?.id])

  const handleStamp = async () => {
    try {
      const radius = Number(info?.stampRadius)
      const pointCoordinate = Array.isArray(info?.pointCoordinate) ? info.pointCoordinate : null
      const [pointLon, pointLat] = pointCoordinate || []

      if (Number.isFinite(radius) && radius > 0 && Number.isFinite(pointLat) && Number.isFinite(pointLon)) {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          Alert.alert("Permiso requerido", "Activa el permiso de ubicación para estampar este punto.")

          // Track stamp failure due to location permission
          posthog.capture('stamp_failed', {
            site_id: info.id,
            site_name: info.name,
            failure_reason: 'location_permission_denied',
          })
          return
        }

        let pos = await Location.getLastKnownPositionAsync()
        if (!pos) pos = await Location.getCurrentPositionAsync({})
        const userLat = pos?.coords?.latitude
        const userLon = pos?.coords?.longitude

        if (!Number.isFinite(userLat) || !Number.isFinite(userLon)) {
          Alert.alert("Ubicación no disponible", "No pudimos validar tu ubicación para estampar este punto.")

          // Track stamp failure due to location unavailable
          posthog.capture('stamp_failed', {
            site_id: info.id,
            site_name: info.name,
            failure_reason: 'location_unavailable',
          })
          return
        }

        const distance = getDistanceMeters(userLat, userLon, pointLat, pointLon)
        if (distance > radius) {
          Alert.alert("Estás lejos", "Necesitas estar más cerca del punto para estampar tu pasaporte.")

          // Track stamp failure due to distance
          posthog.capture('stamp_failed', {
            site_id: info.id,
            site_name: info.name,
            failure_reason: 'too_far_away',
            distance_meters: Math.round(distance),
            required_radius: radius,
          })
          return
        }
      }

      setStamping(true)
      setOverlayDismissible(false)
      await stampVisit(user.$id, info.id)
      await addPoints(info.score)
      await siteVisited()
      await Promise.all([getStats(), fetchVisits(user.$id)])
      setIsVisited(true)
      if (stampUri) {
        Image.prefetch(stampUri).catch(() => {})
      }
      setShowStampOverlay(true)

      // Track successful site stamp - key conversion event
      posthog.capture('site_stamped', {
        site_id: info.id,
        site_name: info.name,
        site_type: info.type,
        site_subtype: info.subType,
        is_free: info.isFree,
        score: info.score,
        route: info.route,
      })
    } catch (error) {
      console.error('Error stamping visit:', error)

      // Track stamp failure with error details
      posthog.capture('stamp_failed', {
        site_id: info.id,
        site_name: info.name,
        failure_reason: 'error',
        error_message: error.message,
      })

      // Capture exception for error tracking
      posthog.capture('$exception', {
        $exception_list: [
          {
            type: error.name || 'StampError',
            value: error.message,
            stacktrace: {
              type: 'raw',
              frames: error.stack ?? '',
            },
          },
        ],
        $exception_source: 'react-native',
        screen: 'InfoCard',
        site_id: info.id,
      })
    } finally {
      setStamping(false)
    }
  }

  const handleOverlayFinish = () => {
    setOverlayDismissible(true)
  }

  const handleOverlayDismiss = () => {
    setShowStampOverlay(false)
    onClose?.()
    router.push('/dashboard/passportScreen')
  }

  const handleOverlayCloseHere = () => {
    setShowStampOverlay(false)
  }

  const handleWebsitePress = async () => {
    if (!websiteUrl) return
    try {
      const supported = await Linking.canOpenURL(websiteUrl)
      if (supported) {
        await Linking.openURL(websiteUrl)

        // Track external website click
        posthog.capture('external_website_clicked', {
          site_id: info.id,
          site_name: info.name,
          website_url: websiteUrl,
        })
      } else {
        console.warn('Cannot open website URL:', websiteUrl)
      }
    } catch (error) {
      console.error('Error opening website URL:', error)
    }
  }

  return (
    <>
      <Card mode="elevated" style={[styles.card, { maxHeight: cardMaxHeight }]}>
        <ScrollView
          style={[styles.scrollArea, { maxHeight: cardMaxHeight }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          <Card.Title
            titleStyle={styles.title}
            titleNumberOfLines={3}
            title={info.name || "Punto"}
            right={(props) => <IconButton {...props} icon="close" onPress={onClose} />}
          />
          <View style={styles.coverWrapper}>
            <Card.Cover source={{ uri: coverUri || 'https://picsum.photos/700' }} style={styles.cover} />
          </View>
          <Card.Content>
            <View style={styles.chipsRow}>
              {
                info.isFree ? <Chip
                                icon={() => (
                                  <Ionicons name="logo-usd" size={25} color="#9a9a9aff" />
                                )}>Gratis</Chip>
                            : <Chip
                                icon={() => (
                                  <Ionicons name="logo-usd" size={25} color="#2cb587ff" />
                                )}>Pagado</Chip>
              }
              {websiteUrl ? (
                <Chip onPress={handleWebsitePress}
                  icon={() => (
                    <Ionicons name="globe-outline" size={25} color="#1737f0ff" />
                  )}>Web</Chip>
              ) : null}
              <Chip
                icon={() => (
                  <Ionicons name="location-outline" size={25} color="#ee2828ff" />
                )}>{info.subType}</Chip>
              {
                info.route ? <Chip
                                icon={() => (
                                  <Ionicons name="git-branch-outline" size={25} color="#6c4a00ff" />
                                )}>Ruta: {info.route}</Chip> : null
              }
            </View>
            {!!info.description && <Text style={styles.description}>{info.description}</Text>}
          </Card.Content>

          <Card.Actions >
            {
              isVisited ? <Button
                            icon="check-decagram"
                            mode="contained"
                            style={{ marginTop: 8 }}
                            buttonColor='#17972fff'
                          >
                            Sitio Visitado
                          </Button>
                        : <Button
                            icon="stamper"
                            mode="contained"
                            style={{ marginTop: 8 }}
                            theme={theme}
                            onPress={handleStamp}
                            loading={stamping}
                            disabled={stamping}
                            testID="stamp-button"
                          >
                            Estampar
                          </Button>
            }
          </Card.Actions>
        </ScrollView>
      </Card>

      <Portal>
        <StampImpactOverlay
          visible={showStampOverlay}
          accentColor="#C7373F"
          paperColor="#F9F1DE"
          canDismiss={overlayDismissible}
          onDismiss={handleOverlayDismiss}
          onSecondaryDismiss={handleOverlayCloseHere}
          onFinish={handleOverlayFinish}
          stampUri={stampUri}
        />
      </Portal>
    </>
  )
}

export default InfoCard

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  card: {
    flexShrink: 1,
    overflow: 'hidden',
  },
  scrollArea: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  coverWrapper: {
    paddingHorizontal: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  cover: {
    height: 180,
    marginBottom: 8,
  },
  description: {
    marginTop: 8,
    marginBottom: 8,
  },
})
