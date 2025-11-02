import { useCallback, useMemo, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { Text, StyleSheet, Modal, Image, View, TouchableOpacity, ScrollView, Platform } from 'react-native'
import { useUser } from '../../hooks/useUser'
import { useSiteVisits } from '../../hooks/useSiteVisits'
import ThemedView from '../../components/ThemedView'

const PassportScreen = () => {
  const { user } = useUser()
  const { visits, sitesVisited, fetchVisits } = useSiteVisits(user.$id)

  const [viewerVisible, setViewerVisible] = useState(false)
  const [viewerUri, setViewerUri] = useState(null)
  const [viewerTitle, setViewerTitle] = useState('')
  const [viewerDate, setViewerDate] = useState('')

  useFocusEffect(
    useCallback(() => {
      if (user?.$id) fetchVisits(user.$id)
    }, [user?.$id])
  )

  const visitsBySite = useMemo(() => {
    const map = {}
    ;(visits ?? []).forEach((v) => { map[v.siteId] = v })
    return map
  }, [visits])

  // Orden: más nuevas -> más antiguas
  const sortedSites = useMemo(() => {
    const arr = (sitesVisited ?? []).map((s) => ({
      ...s,
      _obtainedTs: visitsBySite[s.$id]?.$createdAt ? new Date(visitsBySite[s.$id].$createdAt).getTime() : 0,
    }))
    arr.sort((a, b) => b._obtainedTs - a._obtainedTs)
    return arr
  }, [sitesVisited, visitsBySite])

  // Ángulo determinístico por sello (-3..+3 grados)
  const angleFor = useCallback((id = '') => {
    let h = 0
    for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
    const deg = (Math.abs(h) % 7) - 3
    return `${deg}deg`
  }, [])

  const openImage = (site) => {
    if (!site?.stamp) return
    const dateLabel = visitsBySite[site.$id]?.$createdAt
      ? new Date(visitsBySite[site.$id].$createdAt).toLocaleDateString()
      : '—'
    const nameLabel = site?.name || site?.title || site?.label || ''
    setViewerUri(site.stamp)
    setViewerTitle(nameLabel)
    setViewerDate(dateLabel)
    setViewerVisible(true)
  }
  const closeImage = () => {
    setViewerVisible(false)
    setViewerUri(null)
    setViewerTitle('')
    setViewerDate('')
  }

  return (
    <ThemedView style={styles.root}>
      <ScrollView>
        <View style={styles.gridWrap}>
          {sortedSites.map((site) => {
            const angle = angleFor(site.$id)
            return (
              <TouchableOpacity
                key={String(site.$id)}
                activeOpacity={0.9}
                onPress={() => openImage(site)}
                style={styles.tile}
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
            )
          })}
        </View>
      </ScrollView>

      <Modal visible={viewerVisible} transparent animationType="fade" onRequestClose={closeImage}>
        <View style={styles.modalBackdrop}>
          <Image
            source={{ uri: viewerUri || '' }}
            style={styles.fullImage}
            resizeMode="contain"
            onError={(e) => console.log('Error cargando imagen:', e.nativeEvent)}
          />

          <View style={styles.infoPanel}>
            {!!viewerTitle && <Text style={styles.infoTitle} numberOfLines={2}>{viewerTitle}</Text>}
            <Text style={styles.infoDate}>{viewerDate}</Text>
          </View>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={styles.closeBtn}
          onPress={closeImage}
          activeOpacity={0.1}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  )
}

export default PassportScreen

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4EDE1',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  tile: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 140,
    minWidth: 140,
    maxWidth: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: '90%',
    height: '85%',
    opacity: 0.96,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
    backgroundColor: '#F4EDE1'
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
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
