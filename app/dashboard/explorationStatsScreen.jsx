import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { ActivityIndicator, Menu } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import ThemedView from '../../components/ThemedView'
import { useI18n } from '../../contexts/I18nContext'
import { useExplorationStats, EXPLORATION_STATS_PERIODS } from '../../hooks/useExplorationStats'
import { useUser } from '../../hooks/useUser'
import { formatDate, formatNumber } from '../../i18n/formatters'
import getLocalizedField from '../../i18n/getLocalizedField'

const PERIOD_OPTIONS = [
  EXPLORATION_STATS_PERIODS.DAY,
  EXPLORATION_STATS_PERIODS.WEEK,
  EXPLORATION_STATS_PERIODS.MONTH,
  EXPLORATION_STATS_PERIODS.ALL,
]

const getInsightValue = (value, locale) => {
  const normalizedValue = typeof value === 'string'
    ? value.replace(/^"|"$/g, '').trim()
    : value

  return getLocalizedField({ value: normalizedValue }, 'value', locale, { defaultValue: '' })
}

const clampPercentage = (value) => Math.min(100, Math.max(0, Number(value) || 0))

const formatPercentage = (value, locale) => (
  `${formatNumber(clampPercentage(value), locale, { maximumFractionDigits: 1 })}%`
)

const Metric = ({ icon, label, value }) => (
  <View style={styles.metric}>
    <View style={styles.metricIcon}>
      <Ionicons color="#1F4D5C" name={icon} size={19} />
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
)

const CompactMetric = ({ label, value }) => (
  <View style={styles.compactMetric}>
    <Text style={styles.compactMetricValue}>{value}</Text>
    <Text style={styles.compactMetricLabel}>{label}</Text>
  </View>
)

const ProgressRow = ({ detail, label, percentage, locale }) => {
  const normalizedPercentage = clampPercentage(percentage)

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <View style={styles.progressCopy}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={styles.progressDetail}>{detail}</Text>
        </View>
        <Text style={styles.progressPercentage}>
          {formatPercentage(normalizedPercentage, locale)}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${normalizedPercentage}%` }]} />
      </View>
    </View>
  )
}

const HabitRow = ({ icon, label, value }) => (
  <View style={styles.habitRow}>
    <View style={styles.habitIcon}>
      <Ionicons color="#1F4D5C" name={icon} size={18} />
    </View>
    <Text style={styles.habitLabel}>{label}</Text>
    <Text style={styles.habitValue}>{value}</Text>
  </View>
)

export default function ExplorationStatsScreen() {
  const { t } = useTranslation(['common', 'summaries'])
  const { locale } = useI18n()
  const { user } = useUser()
  const [period, setPeriod] = useState(EXPLORATION_STATS_PERIODS.WEEK)
  const [periodMenuVisible, setPeriodMenuVisible] = useState(false)
  const { error, fetchStats, loading, stats } = useExplorationStats(user?.$id)

  useFocusEffect(
    useCallback(() => {
      fetchStats(period)
    }, [fetchStats, period])
  )

  const selectedPeriodLabel = t(`summaries:stats.periods.${period}`)
  const hasActivity = Boolean(stats && (
    stats.sitesVisited > 0 ||
    stats.routesCompleted > 0 ||
    stats.achievementsUnlocked > 0 ||
    stats.activeDays > 0
  ))
  const topCategory = useMemo(
    () => getInsightValue(stats?.topCategory, locale),
    [locale, stats?.topCategory]
  )
  const topRegion = useMemo(
    () => getInsightValue(stats?.topRegion, locale),
    [locale, stats?.topRegion]
  )
  const categoryDistribution = useMemo(
    () => (stats?.categoryDistribution || [])
      .map((item) => ({
        ...item,
        label: getInsightValue(item.category, locale),
      }))
      .filter((item) => item.label),
    [locale, stats?.categoryDistribution]
  )
  const mostActiveWeekday = stats?.mostActiveWeekday
    ? t(`summaries:stats.weekdays.${stats.mostActiveWeekday}`)
    : ''
  const preferredTimeOfDay = stats?.preferredTimeOfDay
    ? t(`summaries:stats.timesOfDay.${stats.preferredTimeOfDay}`)
    : ''

  const selectPeriod = (nextPeriod) => {
    setPeriodMenuVisible(false)
    setPeriod(nextPeriod)
  }

  const openShareEditor = () => {
    router.push({
      pathname: '/dashboard/explorationStatsShareScreen',
      params: { period },
    })
  }

  return (
    <ThemedView safe style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons color="#1F4D5C" name="chevron-back" size={22} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {t('summaries:stats.title')}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons color="#FFFFFF" name="stats-chart" size={28} />
          </View>
          <Text style={styles.heroTitle}>{t('summaries:stats.heroTitle')}</Text>
          <Text style={styles.heroDescription}>{t('summaries:stats.heroDescription')}</Text>
        </View>

        <View style={styles.selectorSection}>
          <Text style={styles.selectorLabel}>{t('summaries:stats.periodLabel')}</Text>
          <View style={styles.selectorRow}>
            <View style={styles.selectorMenu}>
              <Menu
                anchor={(
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPeriodMenuVisible(true)}
                    style={({ pressed }) => [styles.selector, pressed && styles.pressed]}
                  >
                    <Text style={styles.selectorValue}>{selectedPeriodLabel}</Text>
                    <Ionicons color="#1F4D5C" name="chevron-down" size={18} />
                  </Pressable>
                )}
                onDismiss={() => setPeriodMenuVisible(false)}
                visible={periodMenuVisible}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <Menu.Item
                    key={option}
                    leadingIcon={option === period ? 'check' : undefined}
                    onPress={() => selectPeriod(option)}
                    title={t(`summaries:stats.periods.${option}`)}
                  />
                ))}
              </Menu>
            </View>
            <Pressable
              accessibilityLabel={t('summaries:stats.share.open')}
              accessibilityRole="button"
              disabled={!hasActivity || loading}
              onPress={openShareEditor}
              style={({ pressed }) => [
                styles.shareEditorButton,
                (!hasActivity || loading) && styles.shareEditorButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons color="#FFFFFF" name="share-social-outline" size={19} />
              <Text style={styles.shareEditorButtonText}>{t('summaries:stats.share.open')}</Text>
            </Pressable>
          </View>
          <Text style={styles.periodDescription}>
            {t(`summaries:stats.periodDescriptions.${period}`)}
          </Text>
        </View>

        {loading && !stats ? (
          <View style={styles.stateCard}>
            <ActivityIndicator />
            <Text style={styles.stateText}>{t('summaries:stats.loading')}</Text>
          </View>
        ) : null}

        {error && !stats ? (
          <View style={styles.stateCard}>
            <Ionicons color="#8A3B3B" name="warning-outline" size={28} />
            <Text style={styles.stateText}>{t('summaries:stats.loadError')}</Text>
            <Pressable onPress={() => fetchStats(period)} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>{t('common:actions.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && stats && !hasActivity ? (
          <View style={styles.stateCard}>
            <Ionicons color="#1F4D5C" name="footsteps-outline" size={30} />
            <Text style={styles.stateTitle}>{t('summaries:stats.empty.title')}</Text>
            <Text style={styles.stateText}>{t('summaries:stats.empty.body')}</Text>
          </View>
        ) : null}

        {stats && hasActivity ? (
          <>
            <View style={styles.metricsGrid}>
              <Metric
                icon="location"
                label={t('summaries:stats.metrics.places')}
                value={formatNumber(stats.sitesVisited, locale)}
              />
              <Metric
                icon="map"
                label={t('summaries:stats.metrics.routes')}
                value={formatNumber(stats.routesCompleted, locale)}
              />
              <Metric
                icon="trophy"
                label={t('summaries:stats.metrics.achievements')}
                value={formatNumber(stats.achievementsUnlocked, locale)}
              />
              <Metric
                icon="calendar"
                label={t('summaries:stats.metrics.activeDays')}
                value={formatNumber(stats.activeDays, locale)}
              />
            </View>

            {stats.activeDays > 0 ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{t('summaries:stats.consistency.title')}</Text>
                <View style={styles.compactMetricsRow}>
                  <CompactMetric
                    label={t('summaries:stats.consistency.currentStreak')}
                    value={formatNumber(stats.currentActiveDayStreak, locale)}
                  />
                  <CompactMetric
                    label={t('summaries:stats.consistency.longestStreak')}
                    value={formatNumber(stats.longestActiveDayStreak, locale)}
                  />
                  <CompactMetric
                    label={t('summaries:stats.consistency.averagePlaces')}
                    value={formatNumber(stats.averagePlacesPerActiveDay, locale, {
                      maximumFractionDigits: 1,
                    })}
                  />
                </View>
              </View>
            ) : null}

            {stats.sitesVisited > 0 ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{t('summaries:stats.diversity.title')}</Text>
                <View style={styles.compactMetricsRow}>
                  <CompactMetric
                    label={t('summaries:stats.diversity.categories')}
                    value={formatNumber(stats.categoriesExplored, locale)}
                  />
                  <CompactMetric
                    label={t('summaries:stats.diversity.regions')}
                    value={formatNumber(stats.regionsExplored, locale)}
                  />
                  <CompactMetric
                    label={t('summaries:stats.diversity.communes')}
                    value={formatNumber(stats.communesExplored, locale)}
                  />
                </View>

                {categoryDistribution.length ? (
                  <View style={styles.distribution}>
                    <Text style={styles.subsectionTitle}>
                      {t('summaries:stats.diversity.distribution')}
                    </Text>
                    {categoryDistribution.map((item, index) => {
                      const percentage = stats.sitesVisited > 0
                        ? item.count * 100 / stats.sitesVisited
                        : 0

                      return (
                        <View key={`${item.label}-${index}`} style={styles.distributionRow}>
                          <View style={styles.distributionHeader}>
                            <Text style={styles.distributionLabel}>{item.label}</Text>
                            <Text style={styles.distributionValue}>
                              {formatPercentage(percentage, locale)}
                            </Text>
                          </View>
                          <View style={styles.distributionTrack}>
                            <View
                              style={[
                                styles.distributionFill,
                                { width: `${clampPercentage(percentage)}%` },
                              ]}
                            />
                          </View>
                        </View>
                      )
                    })}
                  </View>
                ) : null}
              </View>
            ) : null}

            {stats.routesStarted > 0 || stats.routesCompleted > 0 ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{t('summaries:stats.routeProgress.title')}</Text>
                <ProgressRow
                  detail={t('summaries:stats.routeProgress.detail', {
                    completed: stats.routesCompleted,
                    started: stats.routesStarted,
                  })}
                  label={t('summaries:stats.routeProgress.completion')}
                  locale={locale}
                  percentage={stats.routeCompletionRate}
                />
              </View>
            ) : null}

            {stats.sitesVisited > 0 ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{t('summaries:stats.habits.title')}</Text>
                {mostActiveWeekday ? (
                  <HabitRow
                    icon="calendar-outline"
                    label={t('summaries:stats.habits.weekday')}
                    value={mostActiveWeekday}
                  />
                ) : null}
                {preferredTimeOfDay ? (
                  <HabitRow
                    icon="time-outline"
                    label={t('summaries:stats.habits.timeOfDay')}
                    value={preferredTimeOfDay}
                  />
                ) : null}
                <HabitRow
                  icon="ticket-outline"
                  label={t('summaries:stats.habits.freeRatio')}
                  value={formatPercentage(stats.freePlacesRatio, locale)}
                />
              </View>
            ) : null}

            {stats.bestDay || topCategory || topRegion ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{t('summaries:stats.insights.title')}</Text>
                {stats.bestDay ? (
                  <View style={styles.insightRow}>
                    <Ionicons color="#1F4D5C" name="sunny-outline" size={19} />
                    <Text style={styles.insightText}>
                      {t('summaries:stats.insights.bestDay', {
                        date: formatDate(`${stats.bestDay}T12:00:00`, locale, {
                          dateStyle: 'medium',
                        }),
                      })}
                    </Text>
                  </View>
                ) : null}
                {topCategory ? (
                  <View style={styles.insightRow}>
                    <Ionicons color="#1F4D5C" name="shapes-outline" size={19} />
                    <Text style={styles.insightText}>
                      {t('summaries:stats.insights.favoriteCategory', {
                        category: topCategory,
                      })}
                    </Text>
                  </View>
                ) : null}
                {topRegion ? (
                  <View style={styles.insightRow}>
                    <Ionicons color="#1F4D5C" name="map-outline" size={19} />
                    <Text style={styles.insightText}>
                      {t('summaries:stats.insights.topRegion', { region: topRegion })}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        {stats ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('summaries:stats.overallProgress.title')}</Text>
            <ProgressRow
              detail={t('summaries:stats.overallProgress.placesDetail', {
                current: stats.publishedPlacesVisited,
                total: stats.publishedPlacesTotal,
              })}
              label={t('summaries:stats.overallProgress.places')}
              locale={locale}
              percentage={stats.placeCompletionRate}
            />
            <ProgressRow
              detail={t('summaries:stats.overallProgress.achievementsDetail', {
                current: stats.publishedAchievementsUnlocked,
                total: stats.publishedAchievementsTotal,
              })}
              label={t('summaries:stats.overallProgress.achievements')}
              locale={locale}
              percentage={stats.achievementCompletionRate}
            />
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  compactMetric: {
    alignItems: 'center',
    backgroundColor: '#F4F7F6',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 94,
    padding: 10,
  },
  compactMetricLabel: {
    color: '#67727C',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 5,
    textAlign: 'center',
  },
  compactMetricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  compactMetricValue: {
    color: '#25303B',
    fontSize: 21,
    fontWeight: '900',
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  distribution: {
    borderTopColor: '#E5E0D6',
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 16,
  },
  distributionFill: {
    backgroundColor: '#4A9C8C',
    borderRadius: 5,
    height: '100%',
  },
  distributionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  distributionLabel: {
    color: '#394550',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  distributionRow: {
    marginTop: 12,
  },
  distributionTrack: {
    backgroundColor: '#E7ECEA',
    borderRadius: 5,
    height: 8,
    overflow: 'hidden',
  },
  distributionValue: {
    color: '#1F4D5C',
    fontSize: 12,
    fontWeight: '800',
  },
  habitIcon: {
    alignItems: 'center',
    backgroundColor: '#E7F0EF',
    borderRadius: 9,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  habitLabel: {
    color: '#5B6572',
    flex: 1,
    fontSize: 13,
  },
  habitRow: {
    alignItems: 'center',
    borderTopColor: '#E5E0D6',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
  },
  habitValue: {
    color: '#25303B',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
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
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
    backgroundColor: '#1F4D5C',
    borderRadius: 22,
    padding: 22,
  },
  heroDescription: {
    color: '#DDE8E8',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    marginBottom: 12,
    width: 52,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  insightRow: {
    alignItems: 'center',
    borderTopColor: '#E5E0D6',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 11,
    paddingVertical: 13,
  },
  insightText: {
    color: '#394550',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  metric: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D8D1C5',
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 128,
    padding: 14,
  },
  metricIcon: {
    alignItems: 'center',
    backgroundColor: '#E7F0EF',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    marginBottom: 8,
    width: 36,
  },
  metricLabel: {
    color: '#67727C',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  metricValue: {
    color: '#25303B',
    fontSize: 25,
    fontWeight: '900',
  },
  periodDescription: {
    color: '#68737D',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
  },
  pressed: {
    opacity: 0.82,
  },
  progressCopy: {
    flex: 1,
  },
  progressDetail: {
    color: '#68737D',
    fontSize: 12,
    marginTop: 3,
  },
  progressFill: {
    backgroundColor: '#4A9C8C',
    borderRadius: 6,
    height: '100%',
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  progressLabel: {
    color: '#394550',
    fontSize: 14,
    fontWeight: '800',
  },
  progressPercentage: {
    color: '#1F4D5C',
    fontSize: 16,
    fontWeight: '900',
  },
  progressRow: {
    borderTopColor: '#E5E0D6',
    borderTopWidth: 1,
    paddingVertical: 14,
  },
  progressTrack: {
    backgroundColor: '#E7ECEA',
    borderRadius: 6,
    height: 10,
    marginTop: 10,
    overflow: 'hidden',
  },
  retryButton: {
    backgroundColor: '#1F4D5C',
    borderRadius: 10,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  screen: {
    backgroundColor: '#F3F1EC',
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8D1C5',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    color: '#25303B',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  selector: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CFC8BC',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    width: '100%',
  },
  selectorLabel: {
    color: '#394550',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
  },
  selectorMenu: {
    flex: 1,
  },
  selectorRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 10,
  },
  selectorSection: {
    marginTop: 18,
  },
  selectorValue: {
    color: '#25303B',
    fontSize: 15,
    fontWeight: '700',
  },
  shareEditorButton: {
    alignItems: 'center',
    backgroundColor: '#C7373F',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  shareEditorButtonDisabled: {
    opacity: 0.45,
  },
  shareEditorButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D8D1C5',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 18,
    padding: 28,
  },
  stateText: {
    color: '#5B6572',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  stateTitle: {
    color: '#25303B',
    fontSize: 18,
    fontWeight: '800',
  },
  subsectionTitle: {
    color: '#394550',
    fontSize: 14,
    fontWeight: '800',
  },
})
