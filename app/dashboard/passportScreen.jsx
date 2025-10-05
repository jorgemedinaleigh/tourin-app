import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { Text, FlatList, StyleSheet, Modal, Image, View, TouchableOpacity } from 'react-native'
import { Card, Avatar } from 'react-native-paper'
import { useUser } from '../../hooks/useUser'
import { useSiteVisits } from '../../hooks/useSiteVisits'
import ThemedView from '../../components/ThemedView'

const passportScreen = () => {
  const { user } = useUser()
  const { visits, sitesVisited, fetchVisits } = useSiteVisits(user.$id)

  const [viewerVisible, setViewerVisible] = useState(false)
  const [viewerUri, setViewerUri] = useState(null)

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
      if(user?.$id) {
        fetchVisits(user.$id)
      }
    }, [user?.$id])
  )

  return (
    <ThemedView style={{ flex: 1 }} >
      <Text style={styles.title}>Tu pasaporte Patrimonial Digital</Text>
      <FlatList
        data={sitesVisited ?? []}
        keyExtractor={(item) => String(item.$id)}
        renderItem={({item}) => (
          <Card style={styles.stampCard} onPress={() => openImage(item.stamp)}>
            <Card.Title 
              title={item.name} 
              left={(props) => (
                <Avatar.Image
                  {...props}
                  size={48}
                  source={{ uri: item.stamp }}
                  onError={(e) => console.log('Error Avatar.Image:', e.nativeEvent)}
                />
              )}
            />
          </Card>
        )}
        ListEmptyComponent={<Text>No tienes visitas estampadas aún.</Text>}
      />

      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={closeImage}
      >
        <View style={styles.modalBackdrop}>
          <Image
            source={{ uri: viewerUri || '' }}
            style={styles.fullImage}
            resizeMode="contain"
            onError={(e) => console.log('Error cargando imagen:', e.nativeEvent)}
          />
          <TouchableOpacity style={styles.closeBtn} onPress={closeImage} activeOpacity={0.1}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ThemedView>
  )
}

export default passportScreen

const styles = StyleSheet.create({
  title: {
    fontSize: 20, 
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center'
  },
  stampCard: {
    marginTop: 10, 
    marginHorizontal: 10,
    padding: 5, 
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
    fontWeight: '600'
  }
})