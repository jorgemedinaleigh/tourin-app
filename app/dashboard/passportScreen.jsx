import { Text } from 'react-native'
import { FlatList } from 'react-native'
import { useUser } from '../../hooks/useUser'
import { useSiteVisits } from '../../hooks/useSiteVisits'
import ThemedView from '../../components/ThemedView'
import { useEffect } from 'react'

const passportScreen = () => {
  const { user } = useUser()
  const { visits, fetchVisits } = useSiteVisits(user.$id)

  useEffect(() => {
    if(user?.$id) {
      fetchVisits(user.$id)
    }
  }, [user?.$id])

  return (
    <ThemedView style={{ flex: 1 }} >
      <FlatList
        data={visits ?? []}
        keyExtractor={(item) => String(item.$id)}
        renderItem={({item}) => (
          <Text>{item.siteId}</Text>
        )}
        ListEmptyComponent={<Text>No tienes visitad estampadas aún.</Text>}
      />
    </ThemedView>
  )
}

export default passportScreen