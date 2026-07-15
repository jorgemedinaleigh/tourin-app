import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator } from 'react-native-paper'
import * as Sharing from 'expo-sharing'
import ViewShot, { captureRef } from 'react-native-view-shot'
import { useTranslation } from 'react-i18next'
import ThemedView from '../../components/ThemedView'
import { useI18n } from '../../contexts/I18nContext'
import { useSummaries } from '../../hooks/useSummaries'
import { useSummaryPreferences } from '../../hooks/useSummaryPreferences'
import { useUser } from '../../hooks/useUser'
import { formatDate } from '../../i18n/formatters'
import getLocalizedField from '../../i18n/getLocalizedField'
import { posthog } from '../../lib/posthog'
import { getStampRotation } from '../../utils/stampRotation'

const FALLBACK_STAMP = require('../../assets/icon.png')
const SHARE_CARD_WIDTH = 360
const SHARE_CARD_HEIGHT = 640
const SHARE_STAMP_LIMIT = 4

const normalizeInsightValue = (value) => String(value || '').replace(/^"|"$/g, '').trim()

const getInitialStampIds = (summary, sites) => {
  const availableSiteIds = new Set(sites.map((site) => String(site.$id)))
  const candidates = [
    ...(summary?.featuredSiteIds || []),
    ...sites.map((site) => site.$id),
  ].map(String)

  return [...new Set(candidates)]
    .filter((siteId) => availableSiteIds.has(siteId))
    .slice(0, SHARE_STAMP_LIMIT)
}

const formatPeriod = (summary, locale) => {
  if (!summary) return ''
  const startsAt = `${summary.startsOn}T12:00:00`
  if (summary.periodType === 'active_day') {
    return formatDate(startsAt, locale, { dateStyle: 'full' })
  }

  const endsAt = new Date(`${summary.endsOn}T12:00:00`)
  endsAt.setDate(endsAt.getDate() - 1)
  return `${formatDate(startsAt, locale, { dateStyle: 'medium' })} – ${formatDate(endsAt, locale, { dateStyle: 'medium' })}`
}

const Metric = ({ icon, label, value }) => (
  <View style={styles.metric}>
    <Ionicons color="#1F4D5C" name={icon} size={18} />
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
)

const ShareStoryCard = ({ displayName, locale, preferences, selectedSites, summary, t }) => {
  const explorerTitle = t(`explorerTitles.${summary.payload?.explorerTitleKey || 'explorer'}`)
  const eyebrow = t(summary.periodType === 'weekly' ? 'weekly.eyebrow' : 'activeDay.eyebrow')

  return (
    <View style={storyStyles.card}>
      <View>
        <Text style={storyStyles.brand}>TOURIN</Text>
        <Text style={storyStyles.eyebrow}>{eyebrow}</Text>
        <Text numberOfLines={1} style={storyStyles.name}>{displayName}</Text>
        <Text style={storyStyles.period}>{formatPeriod(summary, locale)}</Text>
      </View>

      <View style={storyStyles.stamps}>
        {selectedSites.map((site) => (
          <View
            key={site.$id}
            style={[
              storyStyles.stampFrame,
              { transform: [{ rotate: getStampRotation(site.$id) }] },
            ]}
          >
            <Image
              resizeMode="contain"
              source={site.stamp ? { uri: site.stamp } : FALLBACK_STAMP}
              style={storyStyles.stamp}
            />
          </View>
        ))}
      </View>

      <View>
        <Text style={storyStyles.explorerTitle}>{explorerTitle}</Text>
        {preferences.shareLocation && summary.payload?.topRegion ? (
          <Text style={storyStyles.location}>{summary.payload.topRegion}</Text>
        ) : null}
        <View style={storyStyles.metrics}>
          <View style={storyStyles.metric}>
            <Text style={storyStyles.metricValue}>{summary.sitesStamped}</Text>
            <Text style={storyStyles.metricLabel}>{t('metrics.places')}</Text>
          </View>
          <View style={storyStyles.metric}>
            <Text style={storyStyles.metricValue}>{summary.routesCompleted}</Text>
            <Text style={storyStyles.metricLabel}>{t('metrics.routes')}</Text>
          </View>
          <View style={storyStyles.metric}>
            <Text style={storyStyles.metricValue}>{summary.achievementsUnlocked}</Text>
            <Text style={storyStyles.metricLabel}>{t('metrics.achievements')}</Text>
          </View>
        </View>
        <Text style={storyStyles.footer}>{t('sharedBrand')}</Text>
      </View>
    </View>
  )
}

export default function SummaryScreen() {
  const params = useLocalSearchParams()
  const summaryId = Array.isArray(params.summaryId) ? params.summaryId[0] : params.summaryId
  const periodType = Array.isArray(params.periodType) ? params.periodType[0] : params.periodType
  const startsOn = Array.isArray(params.startsOn) ? params.startsOn[0] : params.startsOn
  const { t } = useTranslation(['common', 'summaries'])
  const { locale } = useI18n()
  const { user } = useUser()
  const {
    fetchSummaryDetails,
    getOrCreateSummary,
    getRecommendation,
    getSummary,
    markShared,
    markViewed,
  } = useSummaries(user?.$id)
  const { preferences } = useSummaryPreferences(user?.$id)
  const [summary, setSummary] = useState(null)
  const [details, setDetails] = useState({ achievements: [], routes: [], sites: [] })
  const [recommendation, setRecommendation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [selectedStampIds, setSelectedStampIds] = useState([])
  const viewedSummaryRef = useRef(null)
  const stampSelectionSummaryRef = useRef(null)
  const shareCardRef = useRef(null)

  const loadSummary = useCallback(async () => {
    if (!summaryId && (!periodType || !startsOn)) {
      setError(new Error('Missing summary target'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const nextSummary = summaryId
        ? await getSummary(summaryId)
        : await getOrCreateSummary(periodType, startsOn)
      if (!nextSummary) throw new Error('Summary not found')

      const [nextDetails, nextRecommendation] = await Promise.all([
        fetchSummaryDetails(nextSummary),
        getRecommendation(),
      ])
      setSummary(nextSummary)
      setDetails(nextDetails)
      setRecommendation(nextRecommendation)

      if (stampSelectionSummaryRef.current !== nextSummary.$id) {
        stampSelectionSummaryRef.current = nextSummary.$id
        setSelectedStampIds(getInitialStampIds(nextSummary, nextDetails.sites))
      }

      if (viewedSummaryRef.current !== nextSummary.$id) {
        viewedSummaryRef.current = nextSummary.$id
        markViewed(nextSummary.$id).catch(() => {})
        posthog.capture('summary_viewed', {
          period_type: nextSummary.periodType,
          summary_id: nextSummary.$id,
          sites_stamped: nextSummary.sitesStamped,
        })
      }
    } catch (loadError) {
      console.error('Error loading summary:', loadError)
      setError(loadError)
    } finally {
      setLoading(false)
    }
  }, [
    fetchSummaryDetails,
    getOrCreateSummary,
    getRecommendation,
    getSummary,
    markViewed,
    periodType,
    startsOn,
    summaryId,
  ])

  useFocusEffect(
    useCallback(() => {
      loadSummary()
    }, [loadSummary])
  )

  const selectedSites = useMemo(() => {
    const sitesById = new Map(details.sites.map((site) => [String(site.$id), site]))
    return selectedStampIds
      .map((siteId) => sitesById.get(siteId))
      .filter(Boolean)
  }, [details.sites, selectedStampIds])

  useEffect(() => {
    const uris = selectedSites.map((site) => site.stamp).filter(Boolean)
    Promise.allSettled(uris.map((uri) => Image.prefetch(uri))).catch(() => {})
  }, [selectedSites])

  const comparisonLabel = useMemo(() => {
    const delta = Number(summary?.payload?.sitesDelta) || 0
    if (delta > 0) return t('summaries:comparison.more', { count: delta })
    if (delta < 0) return t('summaries:comparison.fewer', { count: Math.abs(delta) })
    return t('summaries:comparison.same')
  }, [summary?.payload?.sitesDelta, t])

  const getName = useCallback(
    (row, fallback = '') => getLocalizedField(row, 'name', locale, { defaultValue: fallback }),
    [locale]
  )

  const toggleStampSelection = useCallback((siteId) => {
    const normalizedSiteId = String(siteId)
    setSelectedStampIds((currentIds) => {
      if (currentIds.includes(normalizedSiteId)) {
        return currentIds.filter((currentId) => currentId !== normalizedSiteId)
      }
      if (currentIds.length >= SHARE_STAMP_LIMIT) return currentIds
      return [...currentIds, normalizedSiteId]
    })
  }, [])

  const handleShare = async () => {
    if (!summary || !shareCardRef.current) return

    setSharing(true)
    try {
      const available = await Sharing.isAvailableAsync()
      if (!available) {
        Alert.alert(t('summaries:share.unavailable'))
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 120))
      const uri = await captureRef(shareCardRef.current, {
        format: 'png',
        height: 1920,
        quality: 1,
        result: 'tmpfile',
        width: 1080,
      })

      await Sharing.shareAsync(uri, {
        dialogTitle: t('summaries:share.action'),
        mimeType: 'image/png',
        UTI: 'public.png',
      })
      await markShared(summary.$id)
      posthog.capture('summary_shared', {
        period_type: summary.periodType,
        summary_id: summary.$id,
        sites_stamped: summary.sitesStamped,
      })
    } catch (shareError) {
      console.error('Error sharing summary:', shareError)
      Alert.alert(t('summaries:share.error'))
    } finally {
      setSharing(false)
    }
  }

  const handleRecommendation = () => {
    if (!recommendation) return

    posthog.capture('summary_recommendation_opened', {
      route_id: recommendation.route?.$id,
      site_id: recommendation.nextSite?.$id,
      summary_id: summary?.$id,
    })

    if (recommendation.route?.$id) {
      router.push({
        pathname: '/dashboard/routeDetails',
        params: { routeId: recommendation.route.$id },
      })
      return
    }

    router.replace('/dashboard/mapScreen')
  }

  if (loading) {
    return (
      <ThemedView safe style={styles.stateScreen}>
        <ActivityIndicator />
        <Text style={styles.stateText}>{t('summaries:loading')}</Text>
      </ThemedView>
    )
  }

  if (error || !summary) {
    return (
      <ThemedView safe style={styles.stateScreen}>
        <Ionicons color="#8A3B3B" name="warning-outline" size={30} />
        <Text style={styles.stateText}>{t('summaries:loadError')}</Text>
        <Pressable onPress={loadSummary} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{t('common:actions.retry')}</Text>
        </Pressable>
      </ThemedView>
    )
  }

  const periodTitle = t(
    summary.periodType === 'weekly' ? 'summaries:weekly.title' : 'summaries:activeDay.title'
  )
  const explorerTitle = t(
    `summaries:explorerTitles.${summary.payload?.explorerTitleKey || 'explorer'}`
  )
  const recommendationRouteName = recommendation?.route
    ? getName(recommendation.route)
    : ''
  const recommendationSiteName = recommendation?.nextSite
    ? getName(recommendation.nextSite)
    : ''

  return (
    <ThemedView safe style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons color="#1F4D5C" name="chevron-back" size={23} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>{periodTitle}</Text>
        <Pressable disabled={sharing} onPress={handleShare} style={styles.headerButton}>
          <Ionicons color="#1F4D5C" name="share-social-outline" size={21} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>
            {t(summary.periodType === 'weekly' ? 'summaries:weekly.eyebrow' : 'summaries:activeDay.eyebrow')}
          </Text>
          <Text style={styles.heroTitle}>{explorerTitle}</Text>
          <Text style={styles.period}>{formatPeriod(summary, locale)}</Text>
          <View style={styles.statusChip}>
            <Ionicons color="#FFFFFF" name={summary.status === 'final' ? 'checkmark' : 'refresh'} size={13} />
            <Text style={styles.statusText}>
              {t(summary.status === 'final' ? 'summaries:statusFinal' : 'summaries:live')}
            </Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <Metric icon="location" label={t('summaries:metrics.places')} value={summary.sitesStamped} />
          <Metric icon="map" label={t('summaries:metrics.routes')} value={summary.routesCompleted} />
          <Metric icon="trophy" label={t('summaries:metrics.achievements')} value={summary.achievementsUnlocked} />
          {summary.periodType === 'weekly' ? (
            <>
              <Metric icon="calendar" label={t('summaries:metrics.activeDays')} value={summary.activeDays} />
              <Metric icon="flame" label={t('summaries:metrics.activeWeeks')} value={summary.activeWeekStreak} />
            </>
          ) : null}
        </View>

        <View style={styles.comparisonCard}>
          <Ionicons color="#1F4D5C" name="trending-up" size={19} />
          <Text style={styles.comparisonText}>{comparisonLabel}</Text>
        </View>

        {summary.payload?.bestDay || summary.payload?.topCategory || summary.payload?.topRegion || summary.freePlacesVisited > 0 || summary.payload?.isPersonalBest ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('summaries:insights.title')}</Text>
            {summary.payload?.isPersonalBest ? (
              <View style={styles.personalBestChip}>
                <Ionicons color="#8A5B00" name="ribbon" size={18} />
                <Text style={styles.personalBestText}>{t('summaries:insights.personalBest')}</Text>
              </View>
            ) : null}
            {summary.payload?.bestDay && summary.periodType === 'weekly' ? (
              <View style={styles.insightRow}>
                <Ionicons color="#1F4D5C" name="sunny-outline" size={18} />
                <Text style={styles.insightText}>
                  {t('summaries:insights.bestDay', {
                    date: formatDate(`${summary.payload.bestDay}T12:00:00`, locale, {
                      dateStyle: 'medium',
                    }),
                  })}
                </Text>
              </View>
            ) : null}
            {summary.payload?.topCategory ? (
              <View style={styles.insightRow}>
                <Ionicons color="#1F4D5C" name="shapes-outline" size={18} />
                <Text style={styles.insightText}>
                  {t('summaries:insights.favoriteCategory', {
                    category: normalizeInsightValue(summary.payload.topCategory),
                  })}
                </Text>
              </View>
            ) : null}
            {summary.payload?.topRegion ? (
              <View style={styles.insightRow}>
                <Ionicons color="#1F4D5C" name="map-outline" size={18} />
                <Text style={styles.insightText}>
                  {t('summaries:insights.topRegion', {
                    region: normalizeInsightValue(summary.payload.topRegion),
                  })}
                </Text>
              </View>
            ) : null}
            {summary.freePlacesVisited > 0 ? (
              <View style={styles.insightRow}>
                <Ionicons color="#1F4D5C" name="ticket-outline" size={18} />
                <Text style={styles.insightText}>
                  {t('summaries:insights.freePlaces', { count: summary.freePlacesVisited })}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {details.sites.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('summaries:share.stampSelectionTitle')}</Text>
            <Text style={styles.stampSelectionDescription}>
              {t('summaries:share.stampSelectionDescription', {
                max: SHARE_STAMP_LIMIT,
                selected: selectedStampIds.length,
              })}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.stampRow}>
                {details.sites.map((site) => {
                  const selectedIndex = selectedStampIds.indexOf(String(site.$id))
                  const isSelected = selectedIndex >= 0
                  const disabled = !isSelected && selectedStampIds.length >= SHARE_STAMP_LIMIT

                  return (
                    <Pressable
                      accessibilityLabel={getName(site)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected, disabled }}
                      disabled={disabled}
                      key={site.$id}
                      onPress={() => toggleStampSelection(site.$id)}
                      style={({ pressed }) => [
                        styles.stampCard,
                        disabled && styles.stampCardDisabled,
                        pressed && styles.stampCardPressed,
                      ]}
                    >
                      <View style={[
                        styles.stampImageFrame,
                        isSelected && styles.stampImageFrameSelected,
                      ]}>
                        <Image
                          resizeMode="contain"
                          source={site.stamp ? { uri: site.stamp } : FALLBACK_STAMP}
                          style={[
                            styles.stampImage,
                            { transform: [{ rotate: getStampRotation(site.$id) }] },
                          ]}
                        />
                        <View style={[
                          styles.stampSelectionBadge,
                          isSelected && styles.stampSelectionBadgeSelected,
                        ]}>
                          {isSelected ? (
                            <Text style={styles.stampSelectionBadgeText}>{selectedIndex + 1}</Text>
                          ) : (
                            <Ionicons color="#1F4D5C" name="add" size={16} />
                          )}
                        </View>
                      </View>
                      <Text numberOfLines={2} style={styles.stampName}>{getName(site)}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {details.routes.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('summaries:routesTitle')}</Text>
            {details.routes.map((route) => (
              <View key={route.$id} style={styles.unlockRow}>
                <Ionicons color="#1F4D5C" name="checkmark-circle" size={21} />
                <Text style={styles.unlockText}>{getName(route)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {details.achievements.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('summaries:achievementsTitle')}</Text>
            {details.achievements.map((achievement) => (
              <View key={achievement.$id} style={styles.unlockRow}>
                <Image
                  source={achievement.badge ? { uri: achievement.badge } : FALLBACK_STAMP}
                  style={styles.achievementBadge}
                />
                <Text style={styles.unlockText}>{getName(achievement)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {recommendation ? (
          <View style={styles.recommendationCard}>
            <Ionicons color="#FFFFFF" name="compass" size={26} />
            <Text style={styles.recommendationEyebrow}>{t('summaries:recommendation.title')}</Text>
            <Text style={styles.recommendationTitle}>
              {recommendation.route
                ? t('summaries:recommendation.continueRoute', { route: recommendationRouteName })
                : t('summaries:recommendation.explorePlace', { site: recommendationSiteName })}
            </Text>
            {recommendation.route ? (
              <Text style={styles.recommendationDescription}>
                {t('summaries:recommendation.description', {
                  current: recommendation.visitedCount,
                  site: recommendationSiteName,
                  total: recommendation.totalCount,
                })}
              </Text>
            ) : null}
            <Pressable onPress={handleRecommendation} style={styles.recommendationButton}>
              <Text style={styles.recommendationButtonText}>
                {t(recommendation.route ? 'summaries:recommendation.openRoute' : 'summaries:recommendation.openMap')}
              </Text>
              <Ionicons color="#1F4D5C" name="arrow-forward" size={18} />
            </Pressable>
          </View>
        ) : null}

        <Pressable disabled={sharing} onPress={handleShare} style={styles.shareButton}>
          {sharing ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons color="#FFFFFF" name="share-social" size={19} />}
          <Text style={styles.shareButtonText}>
            {t(sharing ? 'summaries:share.preparing' : 'summaries:share.action')}
          </Text>
        </Pressable>
      </ScrollView>

      <ViewShot
        collapsable={false}
        options={{ format: 'png', quality: 1, result: 'tmpfile' }}
        ref={shareCardRef}
        style={styles.hiddenShareCard}
      >
        <ShareStoryCard
          displayName={user?.name || t('common:fallbacks.genericUser')}
          locale={locale}
          preferences={preferences}
          selectedSites={selectedSites}
          summary={summary}
          t={(key, options) => t(`summaries:${key}`, options)}
        />
      </ViewShot>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  achievementBadge: {
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  comparisonCard: {
    alignItems: 'center',
    backgroundColor: '#EAF3F1',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  comparisonText: {
    color: '#25434A',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 34,
  },
  eyebrow: {
    color: '#B9D9E3',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerTitle: {
    color: '#25303B',
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  hero: {
    backgroundColor: '#1F4D5C',
    borderRadius: 24,
    padding: 22,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
    marginTop: 8,
  },
  hiddenShareCard: {
    height: SHARE_CARD_HEIGHT,
    left: -10000,
    position: 'absolute',
    top: 0,
    width: SHARE_CARD_WIDTH,
  },
  insightRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  insightText: {
    color: '#4E5963',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  metric: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DED9D0',
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '30%',
    flexGrow: 1,
    gap: 3,
    minWidth: 96,
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  metricLabel: {
    color: '#66717D',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  metricValue: {
    color: '#25303B',
    fontSize: 22,
    fontWeight: '900',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  personalBestChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF2C7',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  personalBestText: {
    color: '#714B00',
    fontSize: 12,
    fontWeight: '800',
  },
  period: {
    color: '#D9E8EC',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  primaryButton: {
    backgroundColor: '#1F4D5C',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  recommendationButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  recommendationButtonText: {
    color: '#1F4D5C',
    fontSize: 13,
    fontWeight: '800',
  },
  recommendationCard: {
    backgroundColor: '#1F4D5C',
    borderRadius: 22,
    padding: 20,
  },
  recommendationDescription: {
    color: '#D9E8EC',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  recommendationEyebrow: {
    color: '#B9D9E3',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  recommendationTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 5,
  },
  screen: {
    backgroundColor: '#F3F1EC',
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DED9D0',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    color: '#25303B',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  shareButton: {
    alignItems: 'center',
    backgroundColor: '#C7373F',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    padding: 15,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  stampCard: {
    marginRight: 12,
    width: 124,
  },
  stampCardDisabled: {
    opacity: 0.45,
  },
  stampCardPressed: {
    opacity: 0.75,
  },
  stampImage: {
    height: '100%',
    width: '100%',
  },
  stampImageFrame: {
    alignItems: 'center',
    backgroundColor: '#F9F1DE',
    borderColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    height: 124,
    justifyContent: 'center',
    padding: 7,
    width: 124,
  },
  stampImageFrameSelected: {
    borderColor: '#1F4D5C',
  },
  stampName: {
    color: '#4E5963',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 7,
    textAlign: 'center',
  },
  stampRow: {
    flexDirection: 'row',
    paddingTop: 5,
  },
  stampSelectionBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#1F4D5C',
    borderRadius: 13,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    right: 5,
    top: 5,
    width: 26,
  },
  stampSelectionBadgeSelected: {
    backgroundColor: '#1F4D5C',
  },
  stampSelectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  stampSelectionDescription: {
    color: '#68737D',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
    marginTop: -6,
  },
  stateScreen: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 30,
  },
  stateText: {
    color: '#5B6572',
    fontSize: 14,
    textAlign: 'center',
  },
  statusChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    marginTop: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  unlockRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
    marginTop: 9,
  },
  unlockText: {
    color: '#34404A',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
})

const storyStyles = StyleSheet.create({
  brand: {
    color: '#C7373F',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
  },
  card: {
    backgroundColor: '#F9F1DE',
    height: SHARE_CARD_HEIGHT,
    justifyContent: 'space-between',
    padding: 28,
    width: SHARE_CARD_WIDTH,
  },
  explorerTitle: {
    color: '#25303B',
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  eyebrow: {
    color: '#1F4D5C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  footer: {
    color: '#7C7467',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 14,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  location: {
    color: '#6B645A',
    fontSize: 11,
    marginTop: 3,
    textAlign: 'center',
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    color: '#6B645A',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  metrics: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    marginTop: 16,
    paddingHorizontal: 8,
    paddingVertical: 13,
  },
  metricValue: {
    color: '#1F4D5C',
    fontSize: 18,
    fontWeight: '900',
  },
  name: {
    color: '#25303B',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 2,
  },
  period: {
    color: '#6B645A',
    fontSize: 10,
    marginTop: 4,
  },
  stamp: {
    height: '100%',
    width: '100%',
  },
  stampFrame: {
    alignItems: 'center',
    backgroundColor: '#F9F1DE',
    height: 126,
    justifyContent: 'center',
    padding: 4,
    width: 126,
  },
  stamps: {
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    width: 262,
  },
})
