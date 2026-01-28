import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import ViewShot, { captureRef } from 'react-native-view-shot'
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native'
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
  ActivityIndicator,
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
const SLIDESHOW_FRAME_SIZE = 1080
const SLIDE_DURATION_SEC = 1.5
const SLIDESHOW_FPS = 30
const MAX_SLIDESHOW_STAMPS = 10

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
  const [selectMode, setSelectMode] = useState(false)
  const [selectedStampIds, setSelectedStampIds] = useState([])
  const [slideshowTargetUri, setSlideshowTargetUri] = useState(null)
  const [slideshowBusy, setSlideshowBusy] = useState(false)
  const [slideshowProgress, setSlideshowProgress] = useState({ current: 0, total: 0 })
  const stampCacheRef = useRef({})
  const viewShotRef = useRef(null)
  const slideshowShotRef = useRef(null)
  const slideshowLoadResolver = useRef(null)

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

  const siteById = useMemo(() => {
    const map = {}
    sortedSites.forEach((site) => {
      map[site.$id] = site
    })
    return map
  }, [sortedSites])

  const selectedSites = useMemo(() => {
    if (!selectedStampIds.length) return []
    return selectedStampIds.map((id) => siteById[id]).filter(Boolean)
  }, [selectedStampIds, siteById])

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

  const exitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelectedStampIds([])
    setSlideshowTargetUri(null)
  }, [])

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

  const waitForSlideshowImage = useCallback((timeoutMs = 1800) => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        slideshowLoadResolver.current = null
        resolve(false)
      }, timeoutMs)
      slideshowLoadResolver.current = () => {
        clearTimeout(timeout)
        slideshowLoadResolver.current = null
        resolve(true)
      }
    })
  }, [])

  const handleSlideshowImageLoad = useCallback(() => {
    if (slideshowLoadResolver.current) {
      slideshowLoadResolver.current()
    }
  }, [])

  const toFFmpegPath = useCallback((uri = '') => {
    if (!uri) return ''
    return uri.startsWith('file://') ? uri.replace('file://', '') : uri
  }, [])

  const buildConcatList = useCallback((framePaths = []) => {
    if (!framePaths.length) return ''
    const lines = []
    framePaths.forEach((path) => {
      const safePath = toFFmpegPath(path).replace(/'/g, "'\\''")
      lines.push(`file '${safePath}'`)
      lines.push(`duration ${SLIDE_DURATION_SEC}`)
    })
    const last = toFFmpegPath(framePaths[framePaths.length - 1]).replace(/'/g, "'\\''")
    lines.push(`file '${last}'`)
    return `${lines.join('\n')}\n`
  }, [toFFmpegPath])

  const captureSlideshowFrame = useCallback(
    async (uri, index, folderUri) => {
      if (!slideshowShotRef.current || !uri) return null

      try {
        await Image.prefetch(uri)
      } catch (prefetchError) {
        console.log('Error prefetch slideshow stamp:', prefetchError)
      }

      const waitForLoad = waitForSlideshowImage()
      setSlideshowTargetUri(uri)
      await new Promise((resolve) => setTimeout(resolve, 60))
      await waitForLoad

      const shotUri = await captureRef(slideshowShotRef.current, {
        format: 'jpg',
        quality: 0.96,
        result: 'tmpfile',
      })
      const frameName = `frame-${String(index + 1).padStart(3, '0')}.jpg`
      const frameUri = `${folderUri}${frameName}`
      await FileSystem.moveAsync({ from: shotUri, to: frameUri })
      return frameUri
    },
    [waitForSlideshowImage]
  )

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

  const toggleSelectStamp = useCallback(
    (site) => {
      if (!site?.$id) return
      setSelectedStampIds((prev) => {
        const alreadySelected = prev.includes(site.$id)
        if (alreadySelected) {
          return prev.filter((id) => id !== site.$id)
        }
        if (prev.length >= MAX_SLIDESHOW_STAMPS) {
          Alert.alert('Limite alcanzado', `Puedes elegir hasta ${MAX_SLIDESHOW_STAMPS} estampas.`)
          return prev
        }
        return [...prev, site.$id]
      })
    },
    [setSelectedStampIds]
  )

  const shareSlideshow = useCallback(async () => {
    if (slideshowBusy) return
    if (!selectedSites.length) {
      Alert.alert('Sin seleccion', 'Elige al menos una estampa para el slideshow.')
      return
    }
    if (selectedSites.length > MAX_SLIDESHOW_STAMPS) {
      Alert.alert('Limite alcanzado', `Puedes elegir hasta ${MAX_SLIDESHOW_STAMPS} estampas.`)
      return
    }

    try {
      const available = sharingAvailable ?? (await Sharing.isAvailableAsync())
      if (!available) {
        Alert.alert('Compartir no disponible', 'No es posible compartir en este dispositivo.')
        return
      }

      setSlideshowBusy(true)
      setSlideshowProgress({ current: 0, total: selectedSites.length })

      const folderUri = `${FileSystem.cacheDirectory}slideshow-${Date.now()}/`
      await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true })

      const frameUris = []
      for (let i = 0; i < selectedSites.length; i += 1) {
        setSlideshowProgress({ current: i + 1, total: selectedSites.length })
        const frameUri = await captureSlideshowFrame(selectedSites[i].stamp, i, folderUri)
        if (!frameUri) {
          throw new Error('No se pudo capturar la estampa.')
        }
        frameUris.push(frameUri)
      }

      const listUri = `${folderUri}frames.txt`
      const listContents = buildConcatList(frameUris)
      await FileSystem.writeAsStringAsync(listUri, listContents)

      const outputUri = `${folderUri}tourin-slideshow-${Date.now()}.mp4`
      const cmd = [
        '-f concat',
        '-safe 0',
        `-i ${toFFmpegPath(listUri)}`,
        '-vsync vfr',
        `-r ${SLIDESHOW_FPS}`,
        '-pix_fmt yuv420p',
        '-c:v libx264',
        toFFmpegPath(outputUri),
      ].join(' ')

      const session = await FFmpegKit.execute(cmd)
      const returnCode = await session.getReturnCode()
      if (!ReturnCode.isSuccess(returnCode)) {
        const failStackTrace = await session.getFailStackTrace()
        console.log('FFmpeg error:', returnCode, failStackTrace)
        throw new Error('FFmpeg failure')
      }

      await Sharing.shareAsync(outputUri, {
        mimeType: 'video/mp4',
        dialogTitle: 'Slideshow TourIn',
      })

      await FileSystem.deleteAsync(folderUri, { idempotent: true })
      exitSelectMode()
    } catch (error) {
      console.log('Error al compartir slideshow:', error)
      Alert.alert('Error', 'No se pudo generar el slideshow.')
    } finally {
      setSlideshowBusy(false)
      setSlideshowProgress({ current: 0, total: 0 })
    }
  }, [
    slideshowBusy,
    selectedSites,
    sharingAvailable,
    captureSlideshowFrame,
    buildConcatList,
    toFFmpegPath,
    exitSelectMode,
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

        <View style={styles.userHeaderActions}>
          {selectMode ? (
            <>
              <View style={styles.selectionCounter}>
                <Text style={styles.selectionCounterText}>
                  {selectedStampIds.length}/{MAX_SLIDESHOW_STAMPS}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.selectionShareButton,
                  (!selectedStampIds.length || slideshowBusy) && styles.selectionShareDisabled,
                ]}
                onPress={shareSlideshow}
                disabled={!selectedStampIds.length || slideshowBusy}
              >
                <Ionicons name="film" size={16} color="#fff" style={styles.shareButtonIcon} />
                <Text style={styles.selectionShareText}>Compartir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.selectionCancelButton}
                onPress={exitSelectMode}
                disabled={slideshowBusy}
              >
                <Text style={styles.selectionCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.multiShareButton}
              onPress={() => setSelectMode(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="film-outline" size={16} color="#3C3A32" style={styles.shareButtonIcon} />
              <Text style={styles.multiShareText}>Slideshow</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ViewShot
        ref={slideshowShotRef}
        style={styles.slideshowShotWrapper}
        options={{ format: 'jpg', quality: 0.96, result: 'tmpfile' }}
        collapsable={false}
      >
        <View style={styles.slideshowShotCanvas}>
          {!!slideshowTargetUri && (
            <Image
              source={{ uri: slideshowTargetUri }}
              style={styles.slideshowShotImage}
              resizeMode="contain"
              onLoad={handleSlideshowImageLoad}
            />
          )}
        </View>
      </ViewShot>

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
                  const isSelected = selectedStampIds.includes(site.$id)
                  return (
                    <View key={String(site.$id)} style={styles.tile}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => {
                          if (selectMode) {
                            toggleSelectStamp(site)
                          } else {
                            openImage(site)
                          }
                        }}
                        onLongPress={() => {
                          if (!selectMode) {
                            setSelectMode(true)
                            toggleSelectStamp(site)
                          }
                        }}
                        style={styles.stampTouchArea}
                        disabled={slideshowBusy}
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

                        {(selectMode || isSelected) && (
                          <View
                            style={[
                              styles.selectionOverlay,
                              isSelected && styles.selectionOverlaySelected,
                            ]}
                            pointerEvents="none"
                          >
                            <View
                              style={[
                                styles.selectionBadge,
                                isSelected && styles.selectionBadgeSelected,
                              ]}
                            >
                              {isSelected ? (
                                <Ionicons name="checkmark" size={14} color="#fff" />
                              ) : (
                                <Ionicons name="ellipse-outline" size={14} color="#fff" />
                              )}
                            </View>
                          </View>
                        )}
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

      <Modal
        visible={slideshowBusy}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.slideshowBackdrop}>
          <View style={styles.slideshowCard}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.slideshowText}>Generando slideshow</Text>
            <Text style={styles.slideshowSubtext}>
              {slideshowProgress.current}/{slideshowProgress.total}
            </Text>
          </View>
        </View>
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
    position: 'relative',
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
  multiShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  multiShareText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3C3A32',
  },
  userHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionCounter: {
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  selectionCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3C3A32',
  },
  selectionShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#2A8F5A',
    marginRight: 8,
  },
  selectionShareDisabled: {
    opacity: 0.5,
  },
  selectionShareText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  selectionCancelButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  selectionCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3C3A32',
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
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  selectionOverlaySelected: {
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  selectionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  selectionBadgeSelected: {
    backgroundColor: '#1E8E3E',
  },
  slideshowShotWrapper: {
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none',
  },
  slideshowShotCanvas: {
    width: SLIDESHOW_FRAME_SIZE,
    height: SLIDESHOW_FRAME_SIZE,
    backgroundColor: PASSPORT_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideshowShotImage: {
    width: '88%',
    height: '88%',
  },
  slideshowBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideshowCard: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
  },
  slideshowText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  slideshowSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
})
