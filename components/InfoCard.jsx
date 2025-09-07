import { Text } from 'react-native'
import { Button, Card, Chip, IconButton, useTheme } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

function InfoCard({ info, onClose }) {
  const theme = useTheme()

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
        <Button icon="stamper" mode="contained" style={{ marginTop: 8 }} theme={theme} >Estampar</Button>
      </Card.Actions>
    </Card>
  )
}

export default InfoCard