import { useCallback } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { ActivityIndicator } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import ThemedView from '../../components/ThemedView'
import { useI18n } from '../../contexts/I18nContext'
import { useUser } from '../../hooks/useUser'
import { useSummaries } from '../../hooks/useSummaries'
import { formatDate } from '../../i18n/formatters'

const formatPeriod = (summary, locale) => {
  const startsAt = `${summary.startsOn}T12:00:00`
  if (summary.periodType === 'active_day') return formatDate(startsAt, locale)

  const endsAt = new Date(`${summary.endsOn}T12:00:00`)
  endsAt.setDate(endsAt.getDate() - 1)
  return `${formatDate(startsAt, locale, { dateStyle: 'medium' })} – ${formatDate(endsAt, locale, { dateStyle: 'medium' })}`
}

export default function SummaryHistoryScreen() {
  const { t } = useTranslation(['common', 'summaries'])
  const { locale } = useI18n()
  const { user } = useUser()
  const { error, fetchHistory, history, loading } = useSummaries(user?.$id)

  useFocusEffect(
    useCallback(() => {
      fetchHistory(500)
    }, [fetchHistory])
  )

  const renderSummary = ({ item }) => (
    <Pressable
      onPress={() => router.push({
        pathname: '/dashboard/summaryScreen',
        params: { summaryId: item.$id },
      })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardIcon}>
        <Ionicons
          color="#FFFFFF"
          name={item.periodType === 'weekly' ? 'calendar' : 'sparkles'}
          size={20}
        />
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>
          {t(item.periodType === 'weekly' ? 'summaries:weekly.title' : 'summaries:activeDay.title')}
        </Text>
        <Text style={styles.cardPeriod}>{formatPeriod(item, locale)}</Text>
        <Text style={styles.cardMetrics}>
          {t('common:counts.places', { count: item.sitesStamped })} · {item.pointsEarned} {t('summaries:metrics.points')}
        </Text>
      </View>
      <Ionicons color="#5B6572" name="chevron-forward" size={19} />
    </Pressable>
  )

  return (
    <ThemedView safe style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons color="#1F4D5C" name="chevron-back" size={22} />
        </Pressable>
        <Text style={styles.title}>{t('summaries:history.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading && !history.length ? (
        <View style={styles.state}>
          <ActivityIndicator />
          <Text style={styles.stateText}>{t('summaries:loading')}</Text>
        </View>
      ) : null}

      {error && !history.length ? (
        <View style={styles.state}>
          <Ionicons color="#8A3B3B" name="warning-outline" size={28} />
          <Text style={styles.stateText}>{t('summaries:loadError')}</Text>
        </View>
      ) : null}

      {!loading && !error && !history.length ? (
        <View style={styles.state}>
          <Ionicons color="#1F4D5C" name="footsteps-outline" size={30} />
          <Text style={styles.stateTitle}>{t('summaries:empty.title')}</Text>
          <Text style={styles.stateText}>{t('summaries:empty.body')}</Text>
        </View>
      ) : null}

      {history.length ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={history}
          keyExtractor={(item) => item.$id}
          renderItem={renderSummary}
          showsVerticalScrollIndicator={false}
        />
      ) : null}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D8D1C5',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 14,
  },
  cardCopy: {
    flex: 1,
  },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: '#1F4D5C',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  cardMetrics: {
    color: '#5B6572',
    fontSize: 12,
    marginTop: 5,
  },
  cardPeriod: {
    color: '#5B6572',
    fontSize: 12,
    marginTop: 3,
  },
  cardTitle: {
    color: '#25303B',
    fontSize: 15,
    fontWeight: '800',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerSpacer: {
    width: 40,
  },
  list: {
    padding: 20,
    paddingTop: 10,
  },
  pressed: {
    opacity: 0.82,
  },
  screen: {
    backgroundColor: '#F3F1EC',
    flex: 1,
  },
  state: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 30,
  },
  stateText: {
    color: '#5B6572',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  stateTitle: {
    color: '#25303B',
    fontSize: 20,
    fontWeight: '800',
  },
  title: {
    color: '#25303B',
    flex: 1,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
})
