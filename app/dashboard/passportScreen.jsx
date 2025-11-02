import { useCallback, useMemo, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { Text, FlatList, StyleSheet, Modal, Image, View, TouchableOpacity, Platform } from 'react-native'
import { useUser } from '../../hooks/useUser'
import { useSiteVisits } from '../../hooks/useSiteVisits'
import ThemedView from '../../components/ThemedView'

const COLS = 2
const ROWS = 3
const STAMPS_PER_PAGE = COLS * ROWS

const PAGE_PADDING_H = 16
const PAGE_PADDING_V = 12
const ROW_GAP = 12
const COL_GAP = 14

const PassportScreen = () => {
  const { user } = useUser()
  const { visits, sitesVisited, fetchVisits } = useSiteVisits(user.$id)

  const [viewerVisible, setViewerVisible] = useState(false)
  const [viewerUri, setViewerUri] = useState(null)
  const [listWidth, setListWidth] = useState(0)
  const [listHeight, setListHeight] = useState(0)

  const openImage = (uri) => {
    if (!uri) return
    setViewerUri(uri)
    setViewerVisible(true)
  }
  const closeImage = () => {
    setViewerVisible(false)
    setViewerUri(null)
  }

  useFocusEffect(
    useCallback(() => {
      if (user?.$id) fetchVisits(user.$id)
    }, [user?.$id])
  )

  const visitBySite = useMemo(() => {
    const map = {}
    ;(visits ?? []).forEach((v) => {
      map[v.siteId] = v
    })
    return map
  }, [visits])

  // Orden: más nuevas -> más antiguas
  const sortedSites = useMemo(() => {
    const arr = (sitesVisited ?? []).map((s) => ({
      ...s,
      _obtainedTs: visitBySite[s.$id]?.$createdAt ? new Date(visitBySite[s.$id].$createdAt).getTime() : 0,
    }))
    arr.sort((a, b) => b._obtainedTs - a._obtainedTs)
    return arr
  }, [sitesVisited, visitBySite])

  // Paginación de 6 por página (2x3)
  const pages = useMemo(() => {
    const out = []
    for (let i = 0; i < sortedSites.length; i += STAMPS_PER_PAGE) {
      out.push(sortedSites.slice(i, i + STAMPS_PER_PAGE))
    }
    return out
  }, [sortedSites])

  // Ángulo determinístico por sello (-3..+3 grados)
  const angleFor = useCallback((id = '') => {
    let h = 0
    for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
    const deg = (Math.abs(h) % 7) - 3
    return `${deg}deg`
  }, [])

  const renderStamp = (site, idxInCol, totalInCol) => {
    const dateLabel = visitBySite[site.$id]?.$createdAt
      ? new Date(visitBySite[site.$id].$createdAt).toLocaleDateString()
      : '—'
    const angle = angleFor(site.$id)

    return (
      <TouchableOpacity
        key={String(site.$id)}
        style={[styles.stampWrap, { marginBottom: idxInCol < totalInCol - 1 ? ROW_GAP : 0 }]}
        activeOpacity={0.9}
        onPress={() => openImage(site.stamp)}
      >
        <View style={styles.stampSlot}>
          {/* Grupo rotado: imagen + fecha */}
          <View style={[styles.twistGroup, { transform: [{ rotate: angle }] }]}>
            <Image
              source={{ uri: site.stamp }}
              style={styles.stampImage}
              resizeMode="contain"
              onError={(e) => console.log('Error Image:', e.nativeEvent)}
            />
            <Text style={styles.inkDate}>{dateLabel}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const renderPage = useCallback(
    ({ item: pageItems }) => {
      const colLeft = pageItems.slice(0, ROWS)
      const colRight = pageItems.slice(ROWS, STAMPS_PER_PAGE)

      return (
        <View
          style={[
            styles.page,
            {
              width: listWidth,
              height: listHeight,
              paddingHorizontal: PAGE_PADDING_H,
              paddingVertical: PAGE_PADDING_V,
            },
          ]}
        >
          {/* Borde/fondo tipo pasaporte (sin línea punteada central) */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={styles.pageBorder} />
          </View>

          <View style={styles.columns}>
            {/* Columna izquierda */}
            <View style={[styles.column, { paddingRight: COL_GAP / 2 }]}>
              {colLeft.map((site, i) => renderStamp(site, i, colLeft.length))}
              {colLeft.length < ROWS &&
                Array.from({ length: ROWS - colLeft.length }).map((_, i) => (
                  <View
                    key={'phL-' + i}
                    style={[styles.stampWrap, { opacity: 0, marginBottom: i < ROWS - colLeft.length - 1 ? ROW_GAP : 0 }]}
                  />
                ))}
            </View>

            {/* Columna derecha */}
            <View style={[styles.column, { paddingLeft: COL_GAP / 2 }]}>
              {colRight.map((site, i) => renderStamp(site, i, colRight.length))}
              {colRight.length < ROWS &&
                Array.from({ length: ROWS - colRight.length }).map((_, i) => (
                  <View
                    key={'phR-' + i}
                    style={[styles.stampWrap, { opacity: 0, marginBottom: i < ROWS - colRight.length - 1 ? ROW_GAP : 0 }]}
                  />
                ))}
            </View>
          </View>
        </View>
      )
    },
    [listWidth, listHeight, visitBySite, angleFor]
  )

  return (
    <ThemedView style={{ flex: 1 }}>
      <View
        style={{ flex: 1 }}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout
          setListWidth(width)
          setListHeight(height)
        }}
      >
        <FlatList
          data={pages}
          keyExtractor={(_, i) => 'page-' + i}
          renderItem={renderPage}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          bounces={false}
        />
      </View>

      <Modal visible={viewerVisible} transparent animationType="fade" onRequestClose={closeImage}>
        <View style={styles.modalBackdrop}>
          <Image
            source={{ uri: viewerUri || '' }}
            style={styles.fullImage}
            resizeMode="contain"
            onError={(e) => console.log('Error cargando imagen:', e.nativeEvent)}
          />
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={closeImage} activeOpacity={0.1}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  )
}

export default PassportScreen

const styles = StyleSheet.create({
  page: {
    position: 'relative',
    backgroundColor: '#F4EDE1', // papel
    borderRadius: 18,
    overflow: 'hidden',
  },
  pageBorder: {
    position: 'absolute',
    inset: 0,
    borderWidth: 1,
    borderRadius: 18,
    borderColor: '#D7CBB8',
  },

  columns: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    justifyContent: 'space-between',
  },

  stampWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  stampSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Grupo rotado (imagen + fecha)
  twistGroup: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Imagen del sello; se deja espacio para la fecha
  stampImage: {
    width: '90%',
    height: '78%',
    opacity: 0.96,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Fecha que sigue el ángulo del sello (hereda rotación)
  inkDate: {
    fontWeight: 'bold',
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    fontSize: 15,
    color: '#2A3B4C',
    opacity: 0.7,
    letterSpacing: 0.5,
    textAlign: 'center',
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
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
