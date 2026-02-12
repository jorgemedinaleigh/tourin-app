import { useCallback, useState, useMemo } from 'react'
import { useFocusEffect } from 'expo-router'
import { Text, FlatList, StyleSheet, Modal, Image, View, TouchableOpacity } from 'react-native'
import { Card } from 'react-native-paper'
import ThemedView from '../../components/ThemedView'
import { useUser } from '../../hooks/useUser'
import { useAchievements } from '../../hooks/useAchievements'
import { posthog } from '../../lib/posthog'

const AchievementsScreen = () => {
  const { user } = useUser()
  const { achievements, fetchAchievements } = useAchievements(user?.$id)

  const [viewerVisible, setViewerVisible] = useState(false)
  const [viewerUri, setViewerUri] = useState(null)
  const [viewerAchievement, setViewerAchievement] = useState(null)

  const openImage = (item) => {
    setViewerUri(item.badge)
    setViewerAchievement(item)
    setViewerVisible(true)

    // Track achievement badge viewed
    posthog.capture('achievement_viewed', {
      achievement_id: item.$id,
      achievement_name: item.name,
      is_unlocked: !!item.unlockedAt,
    })
  }

  useFocusEffect(
    useCallback(() => {
      fetchAchievements()
    }, [user?.$id])
  )

  const achievementsById = useMemo(() => {
    const acc = {}
    for (const a of achievements || []) acc[a.$id] = a
    return acc
  }, [achievements])

  return (
    <ThemedView style={{ padding: 20 }} safe>
      <Text style={styles.title}>Logros</Text>

      <FlatList
        data={achievements}
        keyExtractor={(item) => String(item.$id)}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => openImage(item)}>
            <View style={styles.row}>
              <Image
                source={{ uri: item.badge }}
                style={styles.badgeLeft}
                resizeMode="cover"
                onError={(e) => console.log('Error Image:', e.nativeEvent)}
              />
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                {achievementsById[item.$id]?.unlockedAt ? (
                  <Text style={styles.date}>
                    Desbloqueado el{' '}
                    {new Date(achievementsById[item.$id].unlockedAt).toLocaleDateString()}
                  </Text>
                ) : (
                  <Text style={styles.date}>Bloqueado</Text>
                )}
              </View>
            </View>
          </Card>
        )}
      />

      {/* Full-screen image viewer */}
      <Modal visible={viewerVisible} transparent onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setViewerVisible(false)} />
          <Image source={{ uri: viewerUri }} style={styles.modalImage} resizeMode="contain" />
        </View>
      </Modal>
    </ThemedView>
  )
}

export default AchievementsScreen

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
  },
  card: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeLeft: {
    width: 96,
    height: 96,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    backgroundColor: '#eee',
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    opacity: 0.7,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalImage: {
    width: '90%',
    height: '70%',
  },
})
