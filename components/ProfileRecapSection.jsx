import { useCallback } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { ActivityIndicator } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { useI18n } from '../contexts/I18nContext'
import { useSummaries } from '../hooks/useSummaries'
import { formatDate } from '../i18n/formatters'

const formatPeriodDate = (dateKey, locale) =>
  formatDate(`${dateKey}T12:00:00`, locale, { dateStyle: 'medium' })

const RecapButton = ({ icon, label, onPress, pointsLabel, summary, locale }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.recapButton, pressed && styles.pressed]}
  >
    <View style={styles.iconBadge}>
      <Ionicons color="#FFFFFF" name={icon} size={18} />
    </View>
    <View style={styles.buttonCopy}>
      <Text style={styles.buttonLabel}>{label}</Text>
      <Text style={styles.buttonMeta}>
        {formatPeriodDate(summary.startsOn, locale)} · {summary.sitesStamped} · {summary.pointsEarned} {pointsLabel}
      </Text>
    </View>
    <Ionicons color="#5B6572" name="chevron-forward" size={18} />
  </Pressable>
)

export default function ProfileRecapSection({ userId }) {
  const { t } = useTranslation('summaries')
  const { locale } = useI18n()
  const {
    activeDaySummary,
    loading,
    refreshDashboardSummaries,
    weeklySummary,
  } = useSummaries(userId)

  useFocusEffect(
    useCallback(() => {
      refreshDashboardSummaries()
    }, [refreshDashboardSummaries])
  )

  const openSummary = (summary) => {
    if (!summary?.$id) return
    router.push({
      pathname: '/dashboard/summaryScreen',
      params: { summaryId: summary.$id },
    })
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t('profile.title')}</Text>
      <Text style={styles.description}>{t('profile.description')}</Text>

      {loading && !activeDaySummary && !weeklySummary ? (
        <ActivityIndicator size="small" style={styles.loader} />
      ) : null}

      {activeDaySummary ? (
        <RecapButton
          icon="sparkles"
          label={t('profile.activeDayAction')}
          locale={locale}
          onPress={() => openSummary(activeDaySummary)}
          pointsLabel={t('metrics.points')}
          summary={activeDaySummary}
        />
      ) : null}

      {weeklySummary ? (
        <RecapButton
          icon="calendar"
          label={t('profile.weeklyAction')}
          locale={locale}
          onPress={() => openSummary(weeklySummary)}
          pointsLabel={t('metrics.points')}
          summary={weeklySummary}
        />
      ) : null}

      {!loading && !activeDaySummary && !weeklySummary ? (
        <View style={styles.emptyBlock}>
          <Ionicons color="#6C756F" name="footsteps-outline" size={20} />
          <Text style={styles.emptyText}>{t('empty.body')}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={() => router.push('/dashboard/summaryHistoryScreen')}
        style={({ pressed }) => [styles.historyButton, pressed && styles.pressed]}
      >
        <Ionicons color="#1F4D5C" name="time-outline" size={18} />
        <Text style={styles.historyText}>{t('history.action')}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  buttonCopy: {
    flex: 1,
  },
  buttonLabel: {
    color: '#25303B',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonMeta: {
    color: '#68737D',
    fontSize: 12,
    marginTop: 3,
  },
  description: {
    color: '#68737D',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyBlock: {
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderColor: '#E0E0E0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  emptyText: {
    color: '#5B6572',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  historyButton: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 12,
    padding: 8,
  },
  historyText: {
    color: '#1F4D5C',
    fontSize: 13,
    fontWeight: '700',
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: '#1F4D5C',
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  loader: {
    marginVertical: 18,
  },
  pressed: {
    opacity: 0.8,
  },
  recapButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D8D1C5',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 12,
  },
  section: {
    marginTop: 8,
  },
  title: {
    color: '#2D2D2D',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
})
