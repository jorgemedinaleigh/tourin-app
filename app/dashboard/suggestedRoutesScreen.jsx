import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import ThemedView from '../../components/ThemedView'
import { suggestedRoutes } from '../../constants/suggestedRoutes'

const SuggestedRoutesScreen = () => {
  const theme = useTheme()
  const surfaceVariant = theme.colors.surfaceVariant || '#F1EEE8'
  const outlineVariant = theme.colors.outlineVariant || '#D8D1C5'
  const onSurfaceVariant = theme.colors.onSurfaceVariant || '#5E584F'
  const surface = theme.colors.surface || '#FFFFFF'

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: '#1F4D5C' }]}>
          <Text style={styles.eyebrow}>Dashboard</Text>
          <Text style={styles.heroTitle}>Rutas sugeridas</Text>
          <Text style={styles.heroCopy}>
            Una seleccion rapida para cuando quieras abrir TourIn y salir a recorrer sin planear desde cero.
          </Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Ionicons name="map-outline" size={16} color="#FFFFFF" />
              <Text style={styles.heroStatText}>{suggestedRoutes.length} rutas listas</Text>
            </View>
            <View style={styles.heroStat}>
              <Ionicons name="walk-outline" size={16} color="#FFFFFF" />
              <Text style={styles.heroStatText}>pensadas a pie</Text>
            </View>
          </View>
        </View>

        {suggestedRoutes.map((route, index) => (
          <Pressable
            key={route.id}
            onPress={() =>
              router.push({
                pathname: '/dashboard/routeDetails',
                params: { routeId: route.id },
              })
            }
            style={({ pressed }) => [
              styles.routeCard,
              {
                backgroundColor: surface,
                borderColor: outlineVariant,
              },
              pressed && styles.routeCardPressed,
            ]}
          >
            <View style={styles.routeHeader}>
              <View style={styles.routeTitleBlock}>
                <View style={styles.routeLabelRow}>
                  <Text style={[styles.routeIndex, { color: route.color }]}>
                    Ruta {index + 1}
                  </Text>
                  <View style={[styles.routeIconBadge, { backgroundColor: route.color }]}>
                    <Ionicons name={route.icon} size={16} color="#FFFFFF" />
                  </View>
                </View>
                <Text style={styles.routeTitle}>{route.title}</Text>
                <Text style={[styles.routeSubtitle, { color: onSurfaceVariant }]}>
                  {route.subtitle}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={[styles.metaChip, { backgroundColor: surfaceVariant }]}>
                <Ionicons name="time-outline" size={14} color={route.color} />
                <Text style={styles.metaText}>{route.duration}</Text>
              </View>
              <View style={[styles.metaChip, { backgroundColor: surfaceVariant }]}>
                <Ionicons name="navigate-outline" size={14} color={route.color} />
                <Text style={styles.metaText}>{route.distance}</Text>
              </View>
              <View style={[styles.metaChip, { backgroundColor: surfaceVariant }]}>
                <Ionicons name="star-outline" size={14} color={route.color} />
                <Text style={styles.metaText}>{route.bestFor}</Text>
              </View>
            </View>

            <Text style={[styles.routeDescription, { color: onSurfaceVariant }]}>
              {route.description}
            </Text>

            <View style={styles.stopsSection}>
              <Text style={styles.stopsTitle}>Paradas sugeridas</Text>
              <View style={styles.stopsRow}>
                {route.stops.map((stop) => (
                  <View
                    key={`${route.id}-${stop}`}
                    style={[
                      styles.stopChip,
                      {
                        borderColor: route.color,
                        backgroundColor: `${route.color}12`,
                      },
                    ]}
                  >
                    <Text style={[styles.stopText, { color: route.color }]}>{stop}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.ctaRow}>
              <Text style={[styles.ctaText, { color: route.color }]}>Ver informacion de la ruta</Text>
              <Ionicons name="chevron-forward" size={18} color={route.color} />
            </View>
          </Pressable>
        ))}

        <View style={[styles.footerCard, { backgroundColor: surfaceVariant }]}>
          <Ionicons name="compass-outline" size={20} color="#1F4D5C" />
          <Text style={[styles.footerText, { color: onSurfaceVariant }]}>
            Estas rutas son una guia inicial. Puedes usarlas como punto de partida y adaptarlas con lo
            que veas en el mapa.
          </Text>
        </View>
      </ScrollView>
    </ThemedView>
  )
}

export default SuggestedRoutesScreen

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 28,
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#B9D9E3',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  heroCopy: {
    fontSize: 15,
    lineHeight: 22,
    color: '#E5F0F3',
  },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  heroStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  routeCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  routeCardPressed: {
    opacity: 0.95,
  },
  routeHeader: {
    marginBottom: 14,
  },
  routeTitleBlock: {
    gap: 6,
  },
  routeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeIndex: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E1E1E',
  },
  routeSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A2A2A',
  },
  routeDescription: {
    fontSize: 14,
    lineHeight: 21,
  },
  stopsSection: {
    marginTop: 16,
    gap: 10,
  },
  stopsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2A2A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stopsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stopChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  stopText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ctaRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    padding: 16,
    alignItems: 'flex-start',
  },
  footerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
})
