import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import ViewShot, { captureRef } from 'react-native-view-shot'
import {
  Text,
  StyleSheet,
  Modal,
  Image,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native'
import { Avatar } from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { useUser } from '../../hooks/useUser'
import { useSiteVisits } from '../../hooks/useSiteVisits'
import ThemedView from '../../components/ThemedView'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const PAGE_SIZE = 6
const PASSPORT_BG = '#F9F1DE'
const SHARE_CANVAS_SIZE = 1400

const PassportScreen = () => {
  const { user } = useUser()
  const { visits, sitesVisited, fetchVisits } = useSiteVisits(user.$id)
  const [viewerVisible, setViewerVisible] = useState(false)
  const [viewerUri, setViewerUri] = useState(null)
  const [viewerTitle, setViewerTitle] = useState('')
  const [viewerDate, setViewerDate] = useState('')
  const [preparedStampPath, setPreparedStampPath] = useState(null)
  const [preparedStampFor, setPreparedStampFor] = useState(null)
  const [sharingAvailable, setSharingAvailable] = useState(null)
  const stampCacheRef = useRef({})
  const viewShotRef = useRef(null)

  const displayName = user?.name || 'Usuario'

  useFocusEffect(
    useCallback(() => {
      if (user?.$id) fetchVisits(user.$id)
    }, [user?.$id])
  )

  const visitsBySite = useMemo(() => {
    const map = {}
    ;(visits ?? []).forEach((v) => {
      map[v.siteId] = v
    })
    return map
  }, [visits])

  const sortedSites = useMemo(() => {
    const arr = (sitesVisited ?? []).map((s) => ({
      ...s,
      _obtainedTs: visitsBySite[s.$id]?.$createdAt
        ? new Date(visitsBySite[s.$id].$createdAt).getTime()
        : 0,
    }))
    arr.sort((a, b) => b._obtainedTs - a._obtainedTs)
    return arr
  }, [sitesVisited, visitsBySite])

  const angleFor = useCallback((id = '') => {
    let h = 0
    for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
    const deg = (Math.abs(h) % 31) - 15
    return `${deg}deg`
  }, [])

  const openImage = (site) => {
    if (!site?.stamp) return
    const dateLabel = visitsBySite[site.$id]?.$createdAt
      ? new Date(visitsBySite[site.$id].$createdAt).toLocaleDateString()
      : 'Sin fecha'
    const nameLabel = site?.name || site?.title || site?.label || ''
    setViewerUri(site.stamp)
    setViewerTitle(nameLabel)
    setViewerDate(dateLabel)
    setViewerVisible(true)
    // Iniciar precarga inmediata para que compartir sea mas rapido al instante de abrir el modal.
    precacheStampForSharing(site.stamp)
  }

  const closeImage = () => {
    setViewerVisible(false)
    setViewerUri(null)
    setViewerTitle('')
    setViewerDate('')
    setPreparedStampPath(null)
    setPreparedStampFor(null)
  }

  const hashUri = useCallback((uri = '') => {
    let h = 0
    for (let i = 0; i < uri.length; i++) {
      h = ((h << 5) - h + uri.charCodeAt(i)) | 0
    }
    return Math.abs(h).toString(16)
  }, [])

  // Prepara el archivo en cache cuando se abre el modal, para que el boton compartir sea inmediato.
  const precacheStampForSharing = useCallback(
    async (targetUri = viewerUri) => {
      if (!targetUri) return null
      if (preparedStampFor === targetUri && preparedStampPath) return preparedStampPath

      const fileNameFromUrl = targetUri.split('/').pop()?.split('?')[0] ?? 'stamp.jpg'
      const ext = fileNameFromUrl.includes('.') ? fileNameFromUrl.split('.').pop() : 'jpg'
      const hash = hashUri(targetUri)
      const fileUri = FileSystem.cacheDirectory + `stamp-share-${hash}.${ext}`

      // Reutiliza si ya existe en disco o en cache en memoria.
      try {
        if (stampCacheRef.current[targetUri]) {
          const cachedInfo = await FileSystem.getInfoAsync(stampCacheRef.current[targetUri])
          if (cachedInfo.exists) {
            setPreparedStampPath(stampCacheRef.current[targetUri])
            setPreparedStampFor(targetUri)
            return stampCacheRef.current[targetUri]
          }
        }

        const existingInfo = await FileSystem.getInfoAsync(fileUri)
        if (existingInfo.exists) {
          stampCacheRef.current[targetUri] = fileUri
          setPreparedStampPath(fileUri)
          setPreparedStampFor(targetUri)
          return fileUri
        }
      } catch (infoError) {
        console.log('Error verificando cache de estampa:', infoError)
      }

      try {
        const { uri: downloadedUri } = await FileSystem.downloadAsync(targetUri, fileUri)

        stampCacheRef.current[targetUri] = downloadedUri
        setPreparedStampPath(downloadedUri)
        setPreparedStampFor(targetUri)
        return downloadedUri
      } catch (error) {
        console.log('Error precargando estampa para compartir:', error)
        setPreparedStampPath(null)
        setPreparedStampFor(null)
        return null
      }
    },
    [preparedStampFor, preparedStampPath, viewerUri, hashUri]
  )

  useEffect(() => {
    let active = true
    Sharing.isAvailableAsync()
      .then((available) => {
        if (active) setSharingAvailable(available)
      })
      .catch(() => {
        if (active) setSharingAvailable(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!viewerUri) {
      setPreparedStampPath(null)
      setPreparedStampFor(null)
      return
    }
    precacheStampForSharing(viewerUri)
  }, [viewerUri, precacheStampForSharing])

  const shareCurrentStamp = useCallback(async () => {
    if (!viewerUri) return

    try {
      const available = sharingAvailable ?? (await Sharing.isAvailableAsync())
      if (!available) {
        Alert.alert('Compartir no disponible', 'No es posible compartir imagenes en este dispositivo.')
        return
      }

      let uriToShare = null

      // Genera una version con fondo igual al pasaporte (#F9F1DE) usando captura del view oculto.
      try {
        await Image.prefetch(viewerUri)
        if (viewShotRef.current) {
          uriToShare = await captureRef(viewShotRef.current, {
            format: 'jpg',
            quality: 0.96,
            result: 'tmpfile',
          })
        }
      } catch (captureError) {
        console.log('Error al generar imagen con fondo:', captureError)
      }

      if (!uriToShare) {
        uriToShare =
          preparedStampFor === viewerUri && preparedStampPath
            ? preparedStampPath
            : await precacheStampForSharing(viewerUri)
      }

      if (!uriToShare) {
        Alert.alert('Error', 'No se pudo preparar la estampa para compartir.')
        return
      }

      const uriLower = uriToShare.toLowerCase()
      const mimeType = uriLower.endsWith('.png') ? 'image/png' : 'image/jpeg'

      await Sharing.shareAsync(uriToShare, {
        mimeType,
        dialogTitle: viewerTitle || 'Estampa TourIn',
      })
    } catch (error) {
      console.log('Error al compartir estampa:', error)
      Alert.alert('Error', 'No se pudo compartir la estampa.')
    }
  }, [
    viewerUri,
    viewerTitle,
    preparedStampFor,
    preparedStampPath,
    precacheStampForSharing,
    sharingAvailable,
  ])

  const pages = useMemo(() => {
    const out = []
    for (let i = 0; i < sortedSites.length; i += PAGE_SIZE) {
      out.push(sortedSites.slice(i, i + PAGE_SIZE))
    }
    return out
  }, [sortedSites])

  const formatAppwriteDate = (isoDate) => {
    const date = new Date(isoDate)
    const day = date.getDate().toString().padStart(2, '0')
    const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()

    return `${day}-${month}-${year}`
  }

  const initials = (user?.name || 'Usuario')
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <ThemedView style={styles.root}>
      <View style={styles.userHeader}>
        <View style={styles.userProfile}>
          {user?.photoUrl ? (
            <Image source={{ uri: user?.photoUrl }} style={styles.userAvatar} />
          ) : (
            <Avatar.Text
              size={56}
              label={initials}
              color={'#FFF'}
              style={[styles.userAvatar, { backgroundColor: 'rgba(50, 50, 50, 1)' }]}
            />
          )}

          <View style={styles.userInfoText}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || 'Usuario'} 🇨🇱
            </Text>
            <Text>Explorador Principiante</Text>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.book}
        contentContainerStyle={styles.bookContent}
      >
        {pages.map((pageSites, index) => (
          <View key={`page-${index}`} style={styles.page}>
            <View style={styles.pageCard}>
              <View style={styles.gridWrap}>
                {pageSites.map((site) => {
                  const angle = angleFor(site.$id)
                  return (
                    <View key={String(site.$id)} style={styles.tile}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => openImage(site)}
                        style={styles.stampTouchArea}
                      >
                        <View style={styles.stampSlot}>
                          <View style={[styles.twistGroup, { transform: [{ rotate: angle }] }]}>
                            <Image
                              source={{ uri: site.stamp }}
                              style={styles.stampImage}
                              resizeMode="contain"
                              onError={(e) => console.log('Error Image:', e.nativeEvent)}
                            />
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </View>

              {/* Footer con numero de pagina */}
              <View style={styles.pageFooter}>
                <Text style={styles.pageNumber}>Pagina {index + 1}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={viewerVisible} transparent animationType="fade" onRequestClose={closeImage}>
        <View style={styles.modalBackdrop}>
          {/* View oculto para capturar la estampa con fondo de pasaporte */}
          <ViewShot
            ref={viewShotRef}
            style={styles.shareShotWrapper}
            options={{ format: 'jpg', quality: 0.96, result: 'tmpfile' }}
            collapsable={false}
          >
            <View style={styles.shareShotCanvas}>
              {!!viewerUri && (
                <Image
                  source={{ uri: viewerUri }}
                  style={styles.shareShotImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </ViewShot>

          <Image
            source={{ uri: viewerUri || '' }}
            style={styles.fullImage}
            resizeMode="contain"
            onError={(e) => console.log('Error cargando imagen:', e.nativeEvent)}
          />

          <View style={styles.infoPanel}>
            <View style={styles.infoTextBlock}>
              {!!viewerTitle && (
                <Text style={styles.infoTitle} numberOfLines={2}>
                  {viewerTitle}
                </Text>
              )}
              <Text style={styles.infoDate}>{viewerDate}</Text>
            </View>
            <TouchableOpacity
              style={styles.modalShareButton}
              onPress={shareCurrentStamp}
              activeOpacity={0.8}
            >
              <View style={styles.shareButtonContent}>
                <Ionicons
                  name="share-social"
                  size={16}
                  color="#fff"
                  style={styles.shareButtonIcon}
                />
                <Text style={styles.modalShareText}>Compartir</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={styles.closeBtn}
          onPress={closeImage}
          activeOpacity={0.1}
        >
          <Text style={styles.closeText}>Cerrar</Text>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  )
}

export default PassportScreen

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  book: {
    flex: 1,
  },
  bookContent: {
    flexGrow: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    paddingVertical: 20,
    paddingHorizontal: 5,
  },
  pageCard: {
    flex: 1,
    backgroundColor: PASSPORT_BG,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    shadowColor: '#000',
    shadowOpacity: Platform.OS === 'ios' ? 0.12 : 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  pageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 4,
    color: '#3C3A32',
  },
  pageSubtitle: {
    fontSize: 12,
    marginTop: 4,
    color: '#6F6A5C',
  },
  pageNumber: {
    fontSize: 11,
    color: '#8B8576',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    flexGrow: 1,
  },
  tile: {
    flexBasis: '50%',
    maxWidth: '50%',
    flexShrink: 0,
    flexGrow: 0,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  stampTouchArea: {
    width: '100%',
    height: '100%',
  },
  stampSlot: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  twistGroup: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampImage: {
    width: '100%',
    height: '100%',
    elevation: 2,
  },
  // Boton compartir estampa (overlay)
  shareStampBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  shareStampIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  // Boton compartir pagina
  sharePageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.16)',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  shareButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareButtonIcon: {
    marginRight: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F4EDE1',
  },
  infoPanel: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  infoDate: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    letterSpacing: 0.4,
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  userInfoText: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3C3A32',
  },
  modalShareButton: {
    marginTop: 0,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  modalShareText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  shareShotWrapper: {
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none',
  },
  shareShotCanvas: {
    width: SHARE_CANVAS_SIZE,
    height: SHARE_CANVAS_SIZE,
    backgroundColor: PASSPORT_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareShotImage: {
    width: '90%',
    height: '90%',
  },
})
