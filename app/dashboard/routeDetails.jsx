import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, useTheme } from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ThemedView from '../../components/ThemedView'
import { useSuggestedRoutes } from '../../hooks/useSuggestedRoutes'

const DESCRIPTION_COLLAPSED_LINES = 3

const CollapsibleText = ({ buttonColor, collapsedLines = DESCRIPTION_COLLAPSED_LINES, text, textStyle }) => {
  const { t } = useTranslation('common')
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasMeasured, setHasMeasured] = useState(false)
  const [measuredLineCount, setMeasuredLineCount] = useState(0)

  useEffect(() => {
    setIsExpanded(false)
    setHasMeasured(false)
    setMeasuredLineCount(0)
  }, [collapsedLines, text])

  const handleTextLayout = useCallback(
    (event) => {
      const nextLineCount = event?.nativeEvent?.lines?.length ?? 0
      setHasMeasured(true)
      setMeasuredLineCount((current) => (nextLineCount > current ? nextLineCount : current))
    },
    []
  )

  if (!text) return null

  const isCollapsible = measuredLineCount > collapsedLines
  const numberOfLines = hasMeasured && isCollapsible && !isExpanded ? collapsedLines : undefined

  return (
    <View style={styles.collapsibleTextBlock}>
      <Text numberOfLines={numberOfLines} onTextLayout={handleTextLayout} style={textStyle}>
        {text}
      </Text>

      {hasMeasured && isCollapsible ? (
        <Pressable onPress={() => setIsExpanded((current) => !current)} style={styles.expandButton}>
          <Text style={[styles.expandButtonText, { color: buttonColor }]}>
            {isExpanded ? t('actions.viewLess') : t('actions.viewMore')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const RouteDetailsScreen = () => {
  const theme = useTheme()
  const { t } = useTranslation(['common', 'routes'])
  const { routeId } = useLocalSearchParams()
  const { loading, error, refresh, getRouteById } = useSuggestedRoutes()
  const route = getRouteById(routeId)
  const surface = theme.colors.surface || '#FFFFFF'
  const surfaceVariant = theme.colors.surfaceVariant || '#F1EEE8'
  const outlineVariant = theme.colors.outlineVariant || '#D8D1C5'
  const onSurfaceVariant = theme.colors.onSurfaceVariant || '#5E584F'
  const goToSuggestedRoutes = () => router.replace('/dashboard/suggestedRoutesScreen')

  const getStopKey = (stop) => `${route?.id || 'route'}-${stop.id || stop.name}`

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goToSuggestedRoutes()
        return true
      })

      return () => subscription.remove()
    }, [])
  )

  if (loading && !route) {
    return (
      <ThemedView style={styles.screen}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color="#1F4D5C" />
          <Text style={styles.emptyTitle}>{t('routes:details.loadingTitle')}</Text>
          <Text style={[styles.emptyCopy, { color: onSurfaceVariant }]}>
            {t('routes:details.loadingCopy')}
          </Text>
        </View>
      </ThemedView>
    )
  }

  if (error && !route) {
    return (
      <ThemedView style={styles.screen}>
        <View style={styles.emptyState}>
          <Ionicons name="warning-outline" size={28} color="#1F4D5C" />
          <Text style={styles.emptyTitle}>{t('routes:details.retryTitle')}</Text>
          <Text style={[styles.emptyCopy, { color: onSurfaceVariant }]}>
            {t('routes:details.retryCopy')}
          </Text>
          <Pressable onPress={refresh} style={[styles.primaryButton, { backgroundColor: '#1F4D5C' }]}>
            <Text style={styles.primaryButtonText}>{t('common:actions.retry')}</Text>
          </Pressable>
          <Pressable
            onPress={goToSuggestedRoutes}
            style={[styles.secondaryButton, { backgroundColor: surfaceVariant }]}
          >
            <Text style={styles.secondaryButtonText}>{t('common:actions.back')}</Text>
          </Pressable>
        </View>
      </ThemedView>
    )
  }

  if (!route) {
    return (
      <ThemedView style={styles.screen}>
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={28} color="#1F4D5C" />
          <Text style={styles.emptyTitle}>{t('routes:details.notFoundTitle')}</Text>
          <Text style={[styles.emptyCopy, { color: onSurfaceVariant }]}>
            {t('routes:details.notFoundCopy')}
          </Text>
          <Pressable
            onPress={goToSuggestedRoutes}
            style={[styles.primaryButton, { backgroundColor: '#1F4D5C' }]}
          >
            <Text style={styles.primaryButtonText}>{t('common:actions.back')}</Text>
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
          <Text style={styles.backButtonText}>{t('common:actions.back')}</Text>
        </Pressable>

        <View style={[styles.heroCard, { backgroundColor: route.accentColor }]}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroTitle}>{route.title}</Text>  
            <View style={styles.heroIconBadge}>
              <Ionicons name={route.icon} size={18} color={route.accentColor} />
            </View>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Ionicons name="hourglass-outline" size={15} color="#FFFFFF" />
              <Text style={styles.heroStatText}>{route.duration}</Text>
            </View>
            <View style={styles.heroStat}>
              <Ionicons name="footsteps-outline" size={15} color="#FFFFFF" />
              <Text style={styles.heroStatText}>{route.distance}</Text>
            </View>
            <View style={styles.heroStat}>
              <Ionicons name="walk-outline" size={15} color="#FFFFFF" />
              <Text style={styles.heroStatText}>{route.intensity || t('common:fallbacks.undefined')}</Text>
            </View>
            <View style={styles.heroStat}>
              <Ionicons name="location-outline" size={15} color="#FFFFFF" />
              <Text style={styles.heroStatText}>
                {t('common:counts.places', { count: route.stopCount })}
              </Text>
            </View>
            <View style={styles.heroStat}>
              <Ionicons name="time-outline" size={15} color="#FFFFFF" />
              <Text style={styles.heroStatText}>{route.bestTime || t('common:fallbacks.undefined')}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: surface, borderColor: outlineVariant }]}>
          <Text style={styles.sectionTitle}>{t('routes:details.summaryTitle')}</Text>
          <CollapsibleText
            buttonColor={route.accentColor}
            text={route.description || t('routes:fallbackDescription')}
            textStyle={[styles.sectionCopy, { color: onSurfaceVariant }]}
          />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: surface, borderColor: outlineVariant }]}>
          <Text style={styles.sectionTitle}>{t('routes:details.stopsTitle')}</Text>
          {route.stops.length ? (
            <View style={styles.stopList}>
              {route.stops.map((stop, index) => {
                const stopKey = getStopKey(stop)

                return (
                  <View key={stopKey} style={styles.stopRow}>
                    <View style={[styles.stopNumber, { backgroundColor: route.accentColor }]}>
                      <Text style={styles.stopNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stopCopyBlock}>
                      <Text style={styles.stopName}>{stop.name}</Text>
                      {stop.description ? (
                        <CollapsibleText
                          buttonColor={route.accentColor}
                          text={stop.description}
                          textStyle={[styles.stopDescription, { color: onSurfaceVariant }]}
                        />
                      ) : null}
                    </View>
                  </View>
                )
              })}
            </View>
          ) : (
            <Text style={[styles.sectionCopy, { color: onSurfaceVariant }]}>
              {t('routes:details.emptyStops')}
            </Text>
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: surface, borderColor: outlineVariant }]}>
          <Text style={styles.sectionTitle}>{t('routes:details.tagsTitle')}</Text>
          {route.tags.length ? (
            <View style={styles.highlightsRow}>
              {route.tags.map((tag) => (
                <View
                  key={`${route.id}-${tag}`}
                  style={[
                    styles.highlightChip,
                    {
                      borderColor: route.accentColor,
                      backgroundColor: `${route.accentColor}12`,
                    },
                  ]}
                >
                  <Text style={[styles.highlightText, { color: route.accentColor }]}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.sectionCopy, { color: onSurfaceVariant }]}>
              {t('routes:noTags')}
            </Text>
          )}
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
  collapsibleTextBlock: {
    gap: 4,
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
  expandButton: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  expandButtonText: {
    fontSize: 13,
    fontWeight: '700',
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
    textAlign: 'center',
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
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F4D5C',
  },
})
