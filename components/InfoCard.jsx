import { Text } from 'react-native'
import { Button, Card, Chip, IconButton, useTheme } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useUser } from '../hooks/useUser'
import { useSiteVisits } from '../hooks/useSiteVisits'
import { useEffect, useState } from 'react'
import { useStats } from '../hooks/useStats'

function InfoCard({ info, onClose }) {
  const theme = useTheme()
  const { user } = useUser()
  const { getVisit, stampVisit, fetchVisits } = useSiteVisits(user.$id)
  const { addPoints, siteVisited, getStats } = useStats(user.$id)

  const [isVisited, setIsVisited] = useState(false)
  const [stamping, setStamping] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setIsVisited(false)
      try {
        const v = await getVisit(user.$id, info.id)
        if(alive) {
          setIsVisited(!!v)
        }
      } catch (err) {
        console.error('Error fetching visits:', err)
        if(alive) {
          setIsVisited(false)
        }
      }
    })()
    return () => { alive = false }
  }, [user?.$id, info?.id])

  const handleStamp = async () => {
    try {
      setStamping(true)
      await stampVisit(user.$id, info.id)
      await addPoints(info.score)
      await siteVisited()
      await Promise.all([getStats(), fetchVisits(user.$id)])
      setIsVisited(true)
    } catch (error) {
      console.error('Error stamping visit:', error)
    } finally {
      setStamping(false)
    }
  }

  return (
    <Card mode="elevated" >
      <Card.Title 
        title={info.name || "Punto"}  
        right={(props) => <IconButton {...props} icon="close" onPress={onClose} />}
      />
      <Card.Content >
        <Card.Cover source={{ uri: 'https://picsum.photos/700' }} />
        {!!info.description && <Text style={{ marginTop: 8, marginBottom: 8 }} >{info.description}</Text>}
        {
          info.isFree ? <Chip icon={() => (
                          <MaterialCommunityIcons name="currency-usd" size={25} color="#9a9a9aff" />
                        )}>Gratis</Chip>
                      : <Chip icon={() => (
                          <MaterialCommunityIcons name="currency-usd" size={25} color="#2cb587ff" />
                        )}>{info.price || "Pagado"}</Chip>
        }
      </Card.Content>
      
      <Card.Actions>
        {
          isVisited ? <Button 
                        icon="check-decagram" 
                        mode="contained" 
                        style={{ marginTop: 8 }} 
                        buttonColor='#17972fff'
                      >
                        Sitio Visitado
                      </Button>
                    : <Button 
                        icon="stamper" 
                        mode="contained" 
                        style={{ marginTop: 8 }} 
                        theme={theme} 
                        onPress={handleStamp} 
                        loading={stamping}
                        disabled={stamping}
                      >
                        Estampar
                      </Button>
        }
      </Card.Actions>
    </Card>
  )
}

export default InfoCard