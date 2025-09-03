import { Text } from "react-native"
import { Button, Card, Chip, IconButton } from "react-native-paper"
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import ThemedView from "./ThemedView"

function InfoCard({ info, onClose }) {

  return (
    <ThemedView>
      <Card mode="elevated">
        <Card.Title 
          title={info.name || "Punto"}  
          right={(props) => <IconButton {...props} icon="close" onPress={onClose} />}
        />
        <Card.Content >
          <Card.Cover source={{ uri: 'https://picsum.photos/700' }} />
          {!!info.description && <Text>{info.description}</Text>}
          {
            info.isFree ? <Chip icon={({ size }) => (
                            <MaterialCommunityIcons name="currency-usd" size={25} color="#9a9a9aff" />
                          )}>Gratis</Chip>
                        : <Chip icon={({ size }) => (
                            <MaterialCommunityIcons name="currency-usd" size={25} color="#2cb587ff" />
                        )}>{info.price || "Pagado"}</Chip>
          }
        </Card.Content>
        <Card.Actions>
          <Button icon="stamper" mode="contained" style={{ marginTop: 8 }} >Estampar</Button>
        </Card.Actions>
      </Card>
    </ThemedView>
  )
}

export default InfoCard