import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useTheme } from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { useCallback } from 'react'
import ThemedView from '../../components/ThemedView'
import { getSuggestedRouteById } from '../../constants/suggestedRoutes'

const RouteDetailsScreen = () => {
  const theme = useTheme()
  const { routeId } = useLocalSearchParams()
  const route = getSuggestedRouteById(routeId)
  const surface = theme.colors.surface || '#FFFFFF'
  const surfaceVariant = theme.colors.surfaceVariant || '#F1EEE8'
  const outlineVariant = theme.colors.outlineVariant || '#D8D1C5'
  const onSurfaceVariant = theme.colors.onSurfaceVariant || '#5E584F'
  const goToSuggestedRoutes = () => router.replace('/dashboard/suggestedRoutesScreen')

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goToSuggestedRoutes()
        return true
      })

      return () => subscription.remove()
    }, [])
  )

  if (!route) {
    return (
      <ThemedView style={styles.screen}>
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={28} color="#1F4D5C" />
          <Text style={styles.emptyTitle}>Ruta no encontrada</Text>
          <Text style={[styles.emptyCopy, { color: onSurfaceVariant }]}>
            No pudimos cargar la informacion de esta ruta. Vuelve a la lista para intentar de nuevo.
          </Text>
          <Pressable
            onPress={goToSuggestedRoutes}
            style={[styles.primaryButton, { backgroundColor: '#1F4D5C' }]}
          >
            <Text style={styles.primaryButtonText}>Volver a rutas</Text>
          </Pressable>
        </View>
      </ThemedView>
    )
  }

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={goToSuggestedRoutes}
          style={[styles.backButton, { backgroundColor: surfaceVariant }]}
        >
          <Ionicons name="chevron-back" size={18} color="#1F4D5C" />
          <Text style={styles.backButtonText}>Volver</Text>
        </Pressable>

        <View style={[styles.heroCard, { backgroundColor: route.color }]}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>Ruta sugerida</Text>
            <View style={styles.heroIconBadge}>
              <Ionicons name={route.icon} size={18} color={route.color} />
            </View>
          </View>
          <Text style={styles.heroTitle}>{route.title}</Text>
          <Text style={styles.heroSubtitle}>{route.subtitle}</Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Ionicons name="time-outline" size={15} color="#FFFFFF" />
              <Text style={styles.heroStatText}>{route.duration}</Text>
            </View>
            <View style={styles.heroStat}>
              <Ionicons name="navigate-outline" size={15} color="#FFFFFF" />
              <Text style={styles.heroStatText}>{route.distance}</Text>
            </View>
            <View style={styles.heroStat}>
              <Ionicons name="walk-outline" size={15} color="#FFFFFF" />
              <Text style={styles.heroStatText}>{route.pace}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: surface, borderColor: outlineVariant }]}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <Text style={[styles.sectionCopy, { color: onSurfaceVariant }]}>{route.description}</Text>

          <View style={styles.infoGrid}>
            <View style={[styles.infoChip, { backgroundColor: surfaceVariant }]}>
              <Text style={styles.infoLabel}>Ideal para</Text>
              <Text style={styles.infoValue}>{route.bestFor}</Text>
            </View>
            <View style={[styles.infoChip, { backgroundColor: surfaceVariant }]}>
              <Text style={styles.infoLabel}>Mejor momento</Text>
              <Text style={styles.infoValue}>{route.bestMoment}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: surface, borderColor: outlineVariant }]}>
          <Text style={styles.sectionTitle}>Lo mejor de esta ruta</Text>
          <View style={styles.highlightsRow}>
            {route.highlights.map((highlight) => (
              <View
                key={`${route.id}-${highlight}`}
                style={[
                  styles.highlightChip,
                  {
                    borderColor: route.color,
                    backgroundColor: `${route.color}12`,
                  },
                ]}
              >
                <Text style={[styles.highlightText, { color: route.color }]}>{highlight}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: surface, borderColor: outlineVariant }]}>
          <Text style={styles.sectionTitle}>Paradas sugeridas</Text>
          <View style={styles.stopList}>
            {route.itinerary.map((stop, index) => (
              <View key={`${route.id}-${stop.name}`} style={styles.stopRow}>
                <View style={[styles.stopNumber, { backgroundColor: route.color }]}>
                  <Text style={styles.stopNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stopCopyBlock}>
                  <Text style={styles.stopName}>{stop.name}</Text>
                  <Text style={[styles.stopDescription, { color: onSurfaceVariant }]}>
                    {stop.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.tipCard, { backgroundColor: surfaceVariant }]}>
          <Ionicons name="bulb-outline" size={20} color={route.color} />
          <View style={styles.tipCopy}>
            <Text style={styles.tipTitle}>Consejo rapido</Text>
            <Text style={[styles.tipText, { color: onSurfaceVariant }]}>{route.tip}</Text>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  )
}

export default RouteDetailsScreen

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 28,
    gap: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F4D5C',
  },
  heroCard: {
    borderRadius: 26,
    padding: 22,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#EEF6F8',
  },
  heroIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#F3F8FA',
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
  sectionCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E1E1E',
  },
  sectionCopy: {
    fontSize: 14,
    lineHeight: 21,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoChip: {
    flex: 1,
    minWidth: 140,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#6A6358',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  highlightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  highlightChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  highlightText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stopList: {
    gap: 16,
  },
  stopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stopCopyBlock: {
    flex: 1,
    gap: 4,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  stopDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    padding: 16,
  },
  tipCopy: {
    flex: 1,
    gap: 4,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1E1E',
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E1E1E',
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  primaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
