import { View, Text, StyleSheet, Pressable } from "react-native"
import { Ionicons } from '@expo/vector-icons'

function InfoCard({ visible, info, onClose }) {
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
        {
          info.isFree ? <View style={styles.priceContainer}>
                          <Ionicons size={20} name={"logo-usd"} color={"#8e9794ff"} />
                          <Text style={styles.priceText}>Gratis</Text>
                        </View>
                      : <View style={styles.priceContainer}>
                          <Ionicons size={20} name={"logo-usd"} color={"#2cb587ff"} />
                          <Text style={styles.priceText}>{info.price || "Pagado"}</Text>
                        </View>
        }

        <Pressable hitSlop={10}
          style={({ pressed }) => ([
            styles.stampBtn,
            pressed && {
            opacity: 0.85,
            transform: [{ scale: 0.95 }],
            }
          ])}
          android_ripple={{ color: "rgba(255,255,255,0.2)" }}
        >
          <Text style={styles.stampBtnText}>Estampar</Text>
        </Pressable>

      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
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
    fontSize: 20,
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
    fontSize: 20,
    lineHeight: 20,
    color: "#374151",
  },
  cardBody: {
    marginTop: 8,
    fontSize: 14,
    color: "#374151",
  },
  priceContainer:
  {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 15,
    height: 30,
  },
  priceText: {
    fontSize: 16,
    lineHeight: 20,
  },
  stampBtn: {
    borderRadius: 15,
    height: 50,
    backgroundColor: "#0f9724ff",
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stampBtnText: {
    fontWeight: "600",
    color: "#fff",
    fontSize: 16,
  }
})

export default InfoCard