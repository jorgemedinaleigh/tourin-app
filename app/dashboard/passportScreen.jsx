import { useCallback, useMemo, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { Text, StyleSheet, Modal, Image, View, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native'
import { Avatar } from 'react-native-paper'
import { useUser } from '../../hooks/useUser'
import { useSiteVisits } from '../../hooks/useSiteVisits'
import ThemedView from '../../components/ThemedView'
import Nameplate from '../../components/Nameplate'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const PAGE_SIZE = 6

const PassportScreen = () => {
  const { user } = useUser()
  const { visits, sitesVisited, fetchVisits } = useSiteVisits(user.$id)
  const [viewerVisible, setViewerVisible] = useState(false)
  const [viewerUri, setViewerUri] = useState(null)
  const [viewerTitle, setViewerTitle] = useState('')
  const [viewerDate, setViewerDate] = useState('')

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
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <ThemedView style={styles.root}>
      
      <View style={styles.userHeader}>
        {
          user?.photoUrl ? 
            (<Image source={{ uri: user?.photoUrl }} style={styles.userAvatar}/>) 
            : 
            (
              <Avatar.Text
                size={56}
                label={initials}
                color={'#FFF'}
                style={[styles.userAvatar, { backgroundColor: 'rgba(50, 50, 50, 1)' }]}
              />
            )
        }
        
        <View style={styles.userInfoText}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name || 'Usuario'}
          </Text>
          <Text>Fecha de emisión</Text>
          <Text style={styles.userName} numberOfLines={1}>
            {formatAppwriteDate(user?.registration) || '01-01-1900'}
          </Text>
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
              <View style={styles.pageFooter}>
                <Text style={styles.pageNumber}>Página {index + 1}</Text>
              </View>
            </View>
          </View>
        ))}
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
            {!!viewerTitle && (
              <Text style={styles.infoTitle} numberOfLines={2}>
                {viewerTitle}
              </Text>
            )}
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
    backgroundColor: '#F9F1DE',
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
    alignItems: 'center',
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
    width: '100%',
    height: '100%',
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
})
