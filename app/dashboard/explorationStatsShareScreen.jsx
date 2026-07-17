import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Switch } from 'react-native-paper'
import * as Sharing from 'expo-sharing'
import ViewShot, { captureRef } from 'react-native-view-shot'
import { useTranslation } from 'react-i18next'
import ThemedView from '../../components/ThemedView'
import { useI18n } from '../../contexts/I18nContext'
import { useExplorationStats, EXPLORATION_STATS_PERIODS } from '../../hooks/useExplorationStats'
import { useSiteVisits } from '../../hooks/useSiteVisits'
import { useUser } from '../../hooks/useUser'
import { formatNumber } from '../../i18n/formatters'
import getLocalizedField from '../../i18n/getLocalizedField'
import { getStampRotation } from '../../utils/stampRotation'

const FALLBACK_STAMP = require('../../assets/icon.png')
const SHARE_STAMP_LIMIT = 4
const VALID_PERIODS = new Set(Object.values(EXPLORATION_STATS_PERIODS))

const getLocalizedValue = (value, locale) => {
  const normalizedValue = typeof value === 'string'
    ? value.replace(/^"|"$/g, '').trim()
    : value

  return getLocalizedField({ value: normalizedValue }, 'value', locale, { defaultValue: '' })
}

const StatsShareCard = ({
  displayName,
  locale,
  periodLabel,
  selectedSites,
  showLocation,
  stats,
  t,
  topRegion,
}) => (
  <View style={cardStyles.card}>
    <View>
      <Text style={cardStyles.brand}>TOURIN</Text>
      <Text style={cardStyles.eyebrow}>{t('stats.share.cardEyebrow')}</Text>
      <Text numberOfLines={1} style={cardStyles.name}>{displayName}</Text>
      <Text style={cardStyles.period}>{periodLabel}</Text>
    </View>

    {selectedSites.length ? (
      <View style={cardStyles.stamps}>
        {selectedSites.map((site) => (
          <View
            key={site.$id}
            style={[
              cardStyles.stampFrame,
              { transform: [{ rotate: getStampRotation(site.$id) }] },
            ]}
          >
            <Image
              resizeMode="contain"
              source={site.stamp ? { uri: site.stamp } : FALLBACK_STAMP}
              style={cardStyles.stamp}
            />
          </View>
        ))}
      </View>
    ) : (
      <View style={cardStyles.emptyStamps}>
        <Ionicons color="#1F4D5C" name="compass-outline" size={44} />
      </View>
    )}

    <View>
      <Text style={cardStyles.title}>{t('stats.share.cardTitle')}</Text>
      {showLocation && topRegion ? (
        <Text style={cardStyles.location}>{topRegion}</Text>
      ) : null}
      <View style={cardStyles.metrics}>
        <View style={cardStyles.metric}>
          <Text style={cardStyles.metricValue}>{formatNumber(stats.sitesVisited, locale)}</Text>
          <Text style={cardStyles.metricLabel}>{t('stats.metrics.places')}</Text>
        </View>
        <View style={cardStyles.metric}>
          <Text style={cardStyles.metricValue}>{formatNumber(stats.routesCompleted, locale)}</Text>
          <Text style={cardStyles.metricLabel}>{t('stats.metrics.routes')}</Text>
        </View>
        <View style={cardStyles.metric}>
          <Text style={cardStyles.metricValue}>
            {formatNumber(stats.achievementsUnlocked, locale)}
          </Text>
          <Text style={cardStyles.metricLabel}>{t('stats.metrics.achievements')}</Text>
        </View>
      </View>
      <Text style={cardStyles.footer}>{t('sharedBrand')}</Text>
    </View>
  </View>
)

export default function ExplorationStatsShareScreen() {
  const params = useLocalSearchParams()
  const periodParam = Array.isArray(params.period) ? params.period[0] : params.period
  const period = VALID_PERIODS.has(periodParam)
    ? periodParam
    : EXPLORATION_STATS_PERIODS.WEEK
  const { t } = useTranslation(['common', 'summaries'])
  const { locale } = useI18n()
  const { user } = useUser()
  const { error, fetchStats, loading, stats } = useExplorationStats(user?.$id)
  const { fetchVisits, sitesVisited, visits } = useSiteVisits(user?.$id)
  const [sitesLoading, setSitesLoading] = useState(true)
  const [selectedStampIds, setSelectedStampIds] = useState([])
  const [sharing, setSharing] = useState(false)
  const [showLocation, setShowLocation] = useState(false)
  const initializedSelectionRef = useRef(false)
  const shareCardRef = useRef(null)

  useFocusEffect(
    useCallback(() => {
      let isActive = true
      setSitesLoading(true)
      fetchStats(period)
      fetchVisits(user?.$id).finally(() => {
        if (isActive) setSitesLoading(false)
      })

      return () => {
        isActive = false
      }
    }, [fetchStats, period, user?.$id])
  )

  const periodVisitIds = useMemo(() => {
    const startsAt = stats?.startsAt ? new Date(stats.startsAt).getTime() : null
    const matchingVisits = startsAt
      ? visits.filter((visit) => new Date(visit.$createdAt).getTime() >= startsAt)
      : visits

    return [...new Set(matchingVisits.map((visit) => String(visit.siteId)).filter(Boolean))]
  }, [stats?.startsAt, visits])

  const availableSites = useMemo(() => {
    const sitesById = new Map(sitesVisited.map((site) => [String(site.$id), site]))
    return periodVisitIds.map((siteId) => sitesById.get(siteId)).filter(Boolean)
  }, [periodVisitIds, sitesVisited])

  useEffect(() => {
    if (!stats || initializedSelectionRef.current || sitesLoading) return
    if (periodVisitIds.length > 0 && availableSites.length === 0) return

    initializedSelectionRef.current = true
    setSelectedStampIds(
      availableSites.slice(0, SHARE_STAMP_LIMIT).map((site) => String(site.$id))
    )
  }, [availableSites, periodVisitIds.length, sitesLoading, stats])

  const selectedSites = useMemo(() => {
    const sitesById = new Map(availableSites.map((site) => [String(site.$id), site]))
    return selectedStampIds.map((siteId) => sitesById.get(siteId)).filter(Boolean)
  }, [availableSites, selectedStampIds])

  useEffect(() => {
    const uris = selectedSites.map((site) => site.stamp).filter(Boolean)
    Promise.allSettled(uris.map((uri) => Image.prefetch(uri))).catch(() => {})
  }, [selectedSites])

  const topRegion = getLocalizedValue(stats?.topRegion, locale)
  const periodLabel = t(`summaries:stats.periods.${period}`)
  const getName = useCallback(
    (site) => getLocalizedField(site, 'name', locale, { defaultValue: '' }),
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

  const renderStamp = useCallback(({ item }) => {
    const selectedIndex = selectedStampIds.indexOf(String(item.$id))
    const isSelected = selectedIndex >= 0
    const disabled = !isSelected && selectedStampIds.length >= SHARE_STAMP_LIMIT

    return (
      <Pressable
        accessibilityLabel={getName(item)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected, disabled }}
        disabled={disabled}
        onPress={() => toggleStampSelection(item.$id)}
        style={({ pressed }) => [
          styles.stampOption,
          disabled && styles.stampOptionDisabled,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.stampOptionFrame, isSelected && styles.stampOptionFrameSelected]}>
          <Image
            resizeMode="contain"
            source={item.stamp ? { uri: item.stamp } : FALLBACK_STAMP}
            style={[
              styles.stampOptionImage,
              { transform: [{ rotate: getStampRotation(item.$id) }] },
            ]}
          />
          <View style={[
            styles.selectionBadge,
            isSelected && styles.selectionBadgeSelected,
          ]}>
            {isSelected ? (
              <Text style={styles.selectionBadgeText}>{selectedIndex + 1}</Text>
            ) : (
              <Ionicons color="#1F4D5C" name="add" size={16} />
            )}
          </View>
        </View>
        <Text numberOfLines={2} style={styles.stampOptionName}>{getName(item)}</Text>
      </Pressable>
    )
  }, [getName, selectedStampIds, toggleStampSelection])

  const handleShare = async () => {
    if (!stats || !shareCardRef.current) return

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
        dialogTitle: t('summaries:stats.share.action'),
        mimeType: 'image/png',
        UTI: 'public.png',
      })
    } catch (shareError) {
      console.error('Error sharing exploration stats:', shareError)
      Alert.alert(t('summaries:share.error'))
    } finally {
      setSharing(false)
    }
  }

  if (loading && !stats) {
    return (
      <ThemedView safe style={styles.stateScreen}>
        <ActivityIndicator />
        <Text style={styles.stateText}>{t('summaries:stats.loading')}</Text>
      </ThemedView>
    )
  }

  if (error || !stats) {
    return (
      <ThemedView safe style={styles.stateScreen}>
        <Ionicons color="#8A3B3B" name="warning-outline" size={30} />
        <Text style={styles.stateText}>{t('summaries:stats.loadError')}</Text>
        <Pressable onPress={() => fetchStats(period)} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>{t('common:actions.retry')}</Text>
        </Pressable>
      </ThemedView>
    )
  }

  return (
    <ThemedView safe style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons color="#1F4D5C" name="chevron-back" size={22} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {t('summaries:stats.share.title')}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.sectionTitle}>{t('summaries:stats.share.previewTitle')}</Text>
          <Text style={styles.sectionDescription}>{t('summaries:stats.share.description')}</Text>
        </View>

        <ViewShot
          collapsable={false}
          options={{ format: 'png', quality: 1, result: 'tmpfile' }}
          ref={shareCardRef}
          style={styles.previewShot}
        >
          <StatsShareCard
            displayName={user?.name || t('common:fallbacks.genericUser')}
            locale={locale}
            periodLabel={periodLabel}
            selectedSites={selectedSites}
            showLocation={showLocation}
            stats={stats}
            t={(key, options) => t(`summaries:${key}`, options)}
            topRegion={topRegion}
          />
        </ViewShot>

        <View style={styles.editorSection}>
          <Text style={styles.editorTitle}>{t('summaries:stats.share.stampsTitle')}</Text>
          <Text style={styles.editorDescription}>
            {t('summaries:stats.share.stampsDescription', {
              max: SHARE_STAMP_LIMIT,
              selected: selectedStampIds.length,
            })}
          </Text>
          {sitesLoading ? (
            <ActivityIndicator style={styles.stampsLoader} />
          ) : availableSites.length ? (
            <FlatList
              data={availableSites}
              extraData={selectedStampIds}
              getItemLayout={(_, index) => ({ index, length: 124, offset: 124 * index })}
              horizontal
              keyExtractor={(item) => String(item.$id)}
              renderItem={renderStamp}
              showsHorizontalScrollIndicator={false}
            />
          ) : (
            <Text style={styles.emptyStampsText}>{t('summaries:stats.share.noStamps')}</Text>
          )}
        </View>

        <View style={styles.editorSection}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.editorTitle}>{t('summaries:stats.share.locationTitle')}</Text>
              <Text style={styles.editorDescription}>
                {t('summaries:stats.share.locationDescription')}
              </Text>
            </View>
            <Switch
              disabled={!topRegion}
              onValueChange={setShowLocation}
              value={showLocation && !!topRegion}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footerAction}>
        <Pressable disabled={sharing} onPress={handleShare} style={styles.shareButton}>
          {sharing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons color="#FFFFFF" name="share-social" size={19} />
          )}
          <Text style={styles.shareButtonText}>
            {t(sharing ? 'summaries:share.preparing' : 'summaries:stats.share.action')}
          </Text>
        </Pressable>
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 28,
  },
  editorDescription: {
    color: '#68737D',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  editorSection: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8D1C5',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  editorTitle: {
    color: '#25303B',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyStampsText: {
    color: '#68737D',
    fontSize: 13,
    paddingVertical: 14,
    textAlign: 'center',
  },
  footerAction: {
    backgroundColor: '#F3F1EC',
    borderTopColor: '#D8D1C5',
    borderTopWidth: 1,
    padding: 14,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    color: '#25303B',
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  previewShot: {
    aspectRatio: 9 / 16,
    backgroundColor: '#F9F1DE',
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
  },
  retryButton: {
    backgroundColor: '#1F4D5C',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  screen: {
    backgroundColor: '#F3F1EC',
    flex: 1,
  },
  sectionDescription: {
    color: '#68737D',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#25303B',
    fontSize: 18,
    fontWeight: '800',
  },
  selectionBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#1F4D5C',
    borderRadius: 13,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 4,
    width: 26,
  },
  selectionBadgeSelected: {
    backgroundColor: '#1F4D5C',
  },
  selectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  shareButton: {
    alignItems: 'center',
    backgroundColor: '#C7373F',
    borderRadius: 14,
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
  stampOption: {
    marginRight: 12,
    marginTop: 14,
    width: 112,
  },
  stampOptionDisabled: {
    opacity: 0.45,
  },
  stampOptionFrame: {
    alignItems: 'center',
    backgroundColor: '#F9F1DE',
    borderColor: 'transparent',
    borderRadius: 15,
    borderWidth: 2,
    height: 112,
    justifyContent: 'center',
    padding: 6,
    width: 112,
  },
  stampOptionFrameSelected: {
    borderColor: '#1F4D5C',
  },
  stampOptionImage: {
    height: '100%',
    width: '100%',
  },
  stampOptionName: {
    color: '#4E5963',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 6,
    textAlign: 'center',
  },
  stampsLoader: {
    marginVertical: 28,
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
  toggleCopy: {
    flex: 1,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
})

const cardStyles = StyleSheet.create({
  brand: {
    color: '#C7373F',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
  },
  card: {
    backgroundColor: '#F9F1DE',
    flex: 1,
    justifyContent: 'space-between',
    padding: 26,
  },
  emptyStamps: {
    alignItems: 'center',
    alignSelf: 'center',
    height: 244,
    justifyContent: 'center',
    opacity: 0.35,
    width: 244,
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
    textAlign: 'center',
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
    fontSize: 27,
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
    height: 118,
    justifyContent: 'center',
    padding: 4,
    width: 118,
  },
  stamps: {
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: 244,
  },
  title: {
    color: '#25303B',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
})
