import { View, Text, StyleSheet, Pressable } from "react-native"

function InfoCard({ visible, info, lat, lon, onClose }) {
  if (!visible) return null

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.cardContainer} pointerEvents="auto">
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{info.name || "Punto"}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <Text style={styles.closeBtnText}>×</Text>
          </Pressable>
        </View>

        {!!info.description && <Text style={styles.cardBody}>{info.description}</Text>}

        {(lat != null && lon != null) && (
          <Text style={styles.cardCoords}>
            ({Number(lat).toFixed(5)}, {Number(lon).toFixed(5)})
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  cardContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  closeBtnText: {
    fontSize: 18,
    lineHeight: 18,
    color: "#374151",
  },
  cardBody: {
    marginTop: 8,
    fontSize: 14,
    color: "#374151",
  },
  cardCoords: {
    marginTop: 10,
    fontSize: 12,
    color: "#6B7280",
  },
})

export default InfoCard