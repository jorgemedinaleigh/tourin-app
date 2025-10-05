import { useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { Text, FlatList, Image } from 'react-native'
import { useUser } from '../../hooks/useUser'
import { useSiteVisits } from '../../hooks/useSiteVisits'
import ThemedView from '../../components/ThemedView'
import { Card, Avatar } from 'react-native-paper'

const passportScreen = () => {
  const { user } = useUser()
  const { visits, fetchVisits } = useSiteVisits(user.$id)

  useFocusEffect(
    useCallback(() => {
      if(user?.$id) {
        fetchVisits(user.$id)
      }
    }, [user?.$id])
  )

  return (
    <ThemedView style={{ flex: 1 }} >
      <FlatList
        data={visits ?? []}
        keyExtractor={(item) => String(item.$id)}
        renderItem={({item}) => (
          <Card style={{ marginBottom: 12 }}>
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
    </ThemedView>
  )
}

export default passportScreen