import { Text } from 'react-native'
import { FlatList } from 'react-native'
import { useUser } from '../../hooks/useUser'
import { useSiteVisits } from '../../hooks/useSiteVisits'
import ThemedView from '../../components/ThemedView'
import { useCallback } from 'react'
import { useFocusEffect } from 'expo-router'

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
          <Text>{item.siteId}</Text>
        )}
        ListEmptyComponent={<Text>No tienes visitas estampadas aún.</Text>}
      />
    </ThemedView>
  )
}

export default passportScreen