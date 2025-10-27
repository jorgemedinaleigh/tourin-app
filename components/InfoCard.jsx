import { Text, View, StyleSheet, useWindowDimensions } from 'react-native'
import { Button, Card, Chip, IconButton, useTheme } from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { useUser } from '../hooks/useUser'
import { useSiteVisits } from '../hooks/useSiteVisits'
import { useEffect, useState } from 'react'
import { useStats } from '../hooks/useStats'

function InfoCard({ info, onClose }) {
  const theme = useTheme()
  const { height } = useWindowDimensions() 
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
    <Card mode="elevated" style={[styles.card, { maxHeight: height * 0.9 }]}>
      <Card.Title
        titleStyle={styles.title}
        titleNumberOfLines={3}
        title={info.name || "Punto"}  
        right={(props) => <IconButton {...props} icon="close" onPress={onClose} />}
      />
      <Card.Content >
        <Card.Cover source={{ uri: 'https://picsum.photos/700' }} style={{ height: 180, marginBottom: 8, }} />
        <View style={styles.chipsRow}>
          {
            info.isFree ? <Chip
                            icon={() => (
                              <Ionicons name="logo-usd" size={25} color="#9a9a9aff" />
                            )}>Gratis</Chip>
                        : <Chip
                            icon={() => (
                              <Ionicons name="logo-usd" size={25} color="#2cb587ff" />
                            )}>Pagado</Chip>
          }
          <Chip 
            icon={() => (
              <Ionicons name="location-outline" size={25} color="#ee2828ff" />
            )}>{info.subType}</Chip>
          {
            info.route ? <Chip
                            icon={() => (
                              <Ionicons name="git-branch-outline" size={25} color="#6c4a00ff" />
                            )}>Ruta: {info.route}</Chip> : null
          }
        </View>
        {!!info.description && <Text style={{ marginTop: 8, marginBottom: 8 }} >{info.description}</Text>}
      </Card.Content>
        
      <Card.Actions >
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

const styles = StyleSheet.create({
  title: {
    fontSize: 20, 
    fontWeight: 'bold',
    textAlign: 'center'
  },
  card: {
    flexShrink: 1,
    overflow: 'hidden',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
})