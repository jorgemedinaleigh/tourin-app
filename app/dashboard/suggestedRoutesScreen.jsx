import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { ActivityIndicator, useTheme } from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import ThemedView from '../../components/ThemedView'
import { useSuggestedRoutes } from '../../hooks/useSuggestedRoutes'

const SuggestedRoutesScreen = () => {
  const theme = useTheme()
  const { t } = useTranslation(['common', 'routes'])
  const { routes, loading, error, refresh } = useSuggestedRoutes()
  const surfaceVariant = theme.colors.surfaceVariant || '#F1EEE8'
  const outlineVariant = theme.colors.outlineVariant || '#D8D1C5'
  const onSurfaceVariant = theme.colors.onSurfaceVariant || '#5E584F'
  const surface = theme.colors.surface || '#FFFFFF'
  const hasRoutes = routes.length > 0

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heroTitle}>{t('routes:heroTitle')}</Text>
        <Text style={styles.heroCopy}>
          {t('routes:heroCopy')}
        </Text>
        <View style={styles.heroStat}>
          <Ionicons name="map-outline" size={16} color="#000000" />
          <Text style={styles.heroStatText}>{t('common:counts.routes', { count: routes.length })}</Text>
        </View>

        {loading && !hasRoutes ? (
          <View style={[styles.stateCard, { backgroundColor: surface, borderColor: outlineVariant }]}>
            <ActivityIndicator size="small" color="#1F4D5C" />
            <Text style={styles.stateTitle}>{t('routes:list.loadingTitle')}</Text>
            <Text style={[styles.stateCopy, { color: onSurfaceVariant }]}>
              {t('routes:list.loadingCopy')}
            </Text>
          </View>
        ) : null}

        {error && !hasRoutes ? (
          <View style={[styles.stateCard, { backgroundColor: surface, borderColor: outlineVariant }]}>
            <Ionicons name="warning-outline" size={24} color="#1F4D5C" />
            <Text style={styles.stateTitle}>{t('routes:list.retryTitle')}</Text>
            <Text style={[styles.stateCopy, { color: onSurfaceVariant }]}>
              {t('routes:list.retryCopy')}
            </Text>
            <Pressable onPress={refresh} style={[styles.primaryButton, { backgroundColor: '#1F4D5C' }]}>
              <Text style={styles.primaryButtonText}>{t('common:actions.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && !hasRoutes ? (
          <View style={[styles.stateCard, { backgroundColor: surface, borderColor: outlineVariant }]}>
            <Ionicons name="trail-sign-outline" size={24} color="#1F4D5C" />
            <Text style={styles.stateTitle}>{t('routes:list.emptyTitle')}</Text>
            <Text style={[styles.stateCopy, { color: onSurfaceVariant }]}>
              {t('routes:list.emptyCopy')}
            </Text>
          </View>
        ) : null}

        {hasRoutes
          ? routes.map((route, index) => (
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
                      <Text style={styles.routeTitle}>{route.title}</Text>
                      <View style={[styles.routeIconBadge, { backgroundColor: route.accentColor }]}>
                        <Ionicons name={route.icon} size={16} color="#FFFFFF" />
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={[styles.metaChip, { backgroundColor: surfaceVariant }]}>
                    <Ionicons name="hourglass-outline" size={14} color={route.accentColor} />
                    <Text style={styles.metaText}>{route.duration}</Text>
                  </View>
                  <View style={[styles.metaChip, { backgroundColor: surfaceVariant }]}>
                    <Ionicons name="footsteps-outline" size={14} color={route.accentColor} />
                    <Text style={styles.metaText}>{route.distance}</Text>
                  </View>
                  <View style={[styles.metaChip, { backgroundColor: surfaceVariant }]}>
                    <Ionicons name="walk-outline" size={14} color={route.accentColor} />
                    <Text style={styles.metaText}>{route.intensity || t('common:fallbacks.undefined')}</Text>
                  </View>
                  <View style={[styles.metaChip, { backgroundColor: surfaceVariant }]}>
                    <Ionicons name="location-outline" size={14} color={route.accentColor} />
                    <Text style={styles.metaText}>
                      {t('common:counts.places', { count: route.stopCount })}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.routeDescription, { color: onSurfaceVariant }]}>
                  {route.description || t('routes:fallbackDescription')}
                </Text>

                <View style={styles.stopsSection}>
                  {route.tags.length ? (
                    <View style={styles.stopsRow}>
                      {route.tags.map((tag) => (
                        <View
                          key={`${route.id}-${tag}`}
                          style={[
                            styles.stopChip,
                            {
                              borderColor: route.accentColor,
                              backgroundColor: `${route.accentColor}12`,
                            },
                          ]}
                        >
                          <Text style={[styles.stopText, { color: route.accentColor }]}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.emptyInlineText, { color: onSurfaceVariant }]}>
                      {t('routes:emptyTags')}
                    </Text>
                  )}
                </View>

                <View style={styles.ctaRow}>
                  <Text style={[styles.ctaText, { color: route.accentColor }]}>{t('routes:viewRoute')}</Text>
                  <Ionicons name="chevron-forward" size={18} color={route.accentColor} />
                </View>
              </Pressable>
            ))
          : null}

        <View style={[styles.footerCard, { backgroundColor: surfaceVariant }]}>
          <Ionicons name="compass-outline" size={20} color="#1F4D5C" />
          <Text style={[styles.footerText, { color: onSurfaceVariant }]}>
            {t('routes:footerCopy')}
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
    color: '#000000',
  },
  heroCopy: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
  },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  heroStat: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(169, 169, 169, 0.34)',
  },
  heroStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E1E1E',
    textAlign: 'center',
  },
  stateCopy: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
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
  emptyInlineText: {
    fontSize: 14,
    lineHeight: 20,
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
  primaryButton: {
    marginTop: 4,
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
