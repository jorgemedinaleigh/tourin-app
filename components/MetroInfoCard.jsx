import { StyleSheet, Text, View } from "react-native"
import { Card, IconButton } from "react-native-paper"

function MetroInfoCard({ info, onClose }) {
  if (!info) return null

  const stationName = info.stationName || info.name || "Estacion"
  const line = info.line || "Sin linea"

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title
        titleStyle={styles.title}
        titleNumberOfLines={2}
        title={stationName}
        right={(props) => <IconButton {...props} icon="close" onPress={onClose} />}
      />
      <Card.Content>
        <View style={styles.row}>
          <Text style={styles.label}>Linea</Text>
          <Text style={styles.value}>{line}</Text>
        </View>
      </Card.Content>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  title: {
    fontSize: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  label: {
    fontWeight: "600",
    color: "#525252",
  },
  value: {
    color: "#111827",
  },
})

export default MetroInfoCard
