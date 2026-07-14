import { useCallback, useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSummaries } from '../hooks/useSummaries'

const needsAttention = (summary) => {
  if (!summary) return false
  if (!summary.viewedAt) return true
  return new Date(summary.updatedAt).getTime() > new Date(summary.viewedAt).getTime()
}

export default function SummaryAvailableBanner({ refreshKey, safeTop = 0, userId }) {
  const { t } = useTranslation('summaries')
  const {
    activeDaySummary,
    refreshDashboardSummaries,
    weeklySummary,
  } = useSummaries(userId)

  useFocusEffect(
    useCallback(() => {
      refreshDashboardSummaries()
    }, [refreshDashboardSummaries, refreshKey])
  )

  const summary = useMemo(() => {
    if (needsAttention(weeklySummary)) return weeklySummary
    if (needsAttention(activeDaySummary)) return activeDaySummary
    return null
  }, [activeDaySummary, weeklySummary])

  if (!summary) return null

  return (
    <Pressable
      onPress={() => router.push({
        pathname: '/dashboard/summaryScreen',
        params: { summaryId: summary.$id },
      })}
      style={({ pressed }) => [
        styles.banner,
        { top: safeTop + 10 },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconBadge}>
        <Ionicons color="#FFFFFF" name="sparkles" size={18} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>
          {t(summary.periodType === 'weekly' ? 'weekly.eyebrow' : 'activeDay.eyebrow')}
        </Text>
        <Text numberOfLines={2} style={styles.description}>
          {t(summary.periodType === 'weekly' ? 'banner.weekly' : 'banner.activeDay')}
        </Text>
      </View>
      <Ionicons color="#1F4D5C" name="chevron-forward" size={19} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D8D1C5',
    borderRadius: 16,
    borderWidth: 1,
    elevation: 8,
    flexDirection: 'row',
    gap: 11,
    left: 14,
    padding: 12,
    position: 'absolute',
    right: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 9,
    zIndex: 20,
  },
  copy: {
    flex: 1,
  },
  description: {
    color: '#59646E',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: '#C7373F',
    borderRadius: 11,
    height: 39,
    justifyContent: 'center',
    width: 39,
  },
  pressed: {
    opacity: 0.86,
  },
  title: {
    color: '#25303B',
    fontSize: 13,
    fontWeight: '800',
  },
})
