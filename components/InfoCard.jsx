import { Text, View, StyleSheet, useWindowDimensions, Image, ScrollView } from 'react-native'
import { Button, Card, Chip, IconButton, Portal, useTheme } from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { useUser } from '../hooks/useUser'
import { useSiteVisits } from '../hooks/useSiteVisits'
import { useEffect, useMemo, useState } from 'react'
import { useStats } from '../hooks/useStats'
import { useRouter } from 'expo-router'
import StampImpactOverlay from './StampImpactOverlay'

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

    for (const candidate of candidates) {
      const uri = pickUri(candidate)
      if (uri) return uri
    }

    return null
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
    } catch (error) {
      console.error('Error stamping visit:', error)
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
            <Card.Cover source={{ uri: 'https://picsum.photos/700' }} style={styles.cover} />
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
