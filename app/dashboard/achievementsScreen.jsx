import { memo, useCallback, useMemo, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Card, useTheme } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import ThemedView from '../../components/ThemedView'
import { useI18n } from '../../contexts/I18nContext'
import { useUser } from '../../hooks/useUser'
import { useAchievements } from '../../hooks/useAchievements'
import { formatDate } from '../../i18n/formatters'
import { posthog } from '../../lib/posthog'

const FALLBACK_BADGE = require('../../assets/icon.png')

const getBadgeSource = (badge) => (badge ? { uri: badge, cache: 'force-cache' } : FALLBACK_BADGE)

const AchievementRow = memo(function AchievementRow({
  badge,
  cardStyle,
  criteria,
  id,
  isUnlocked,
  name,
  onPress,
  progressCurrent,
  progressLabel,
  progressPercent,
  progressTarget,
  statusLabel,
}) {
  const handlePress = useCallback(() => {
    if (isUnlocked) onPress(id)
  }, [id, isUnlocked, onPress])
  const showProgress = !isUnlocked && Number.isFinite(progressTarget) && progressTarget > 0

  return (
    <Card mode="contained" style={[styles.card, cardStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !isUnlocked }}
        disabled={!isUnlocked}
        onPress={handlePress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <Image
          source={getBadgeSource(badge)}
          style={[styles.badgeLeft, !isUnlocked && styles.badgeLocked]}
          resizeMode="cover"
          onError={(e) => console.log('Error Image:', e.nativeEvent)}
        />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <Text style={[styles.status, isUnlocked && styles.unlockedStatus]} numberOfLines={1}>
            {statusLabel}
          </Text>
          {!!criteria && (
            <Text style={styles.criteria} numberOfLines={2}>
              {criteria}
            </Text>
          )}
          {showProgress ? (
            <View style={styles.progressBlock}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(0, Math.min(100, progressPercent))}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {progressLabel || `${progressCurrent}/${progressTarget}`}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Card>
  )
})

const AchievementsScreen = () => {
  const { user } = useUser()
  const { achievements, fetchAchievements, loading, error } = useAchievements(user?.$id)
  const { locale } = useI18n()
  const { t } = useTranslation('achievements')
  const theme = useTheme()
  const cardStyle = useMemo(() => ({
    backgroundColor: theme.colors.surface || '#FFFFFF',
    borderColor: theme.colors.outlineVariant || '#D8D1C5',
  }), [theme.colors.outlineVariant, theme.colors.surface])

  const [viewerVisible, setViewerVisible] = useState(false)
  const [viewerUri, setViewerUri] = useState(null)

  useFocusEffect(
    useCallback(() => {
      const abortController = new AbortController()
      fetchAchievements({ signal: abortController.signal })
      return () => abortController.abort()
    }, [fetchAchievements])
  )

  const achievementsById = useMemo(() => {
    const acc = {}
    for (const achievement of achievements || []) acc[achievement.$id] = achievement
    return acc
  }, [achievements])

  const openAchievement = useCallback(
    (achievementId) => {
      const item = achievementsById[achievementId]
      if (!item?.isUnlocked) return

      setViewerUri(item.badge)
      setViewerVisible(true)

      posthog.capture('achievement_viewed', {
        achievement_id: item.$id,
        achievement_name: item.name,
        is_unlocked: !!item.unlockedAt,
      })
    },
    [achievementsById]
  )

  const closeViewer = useCallback(() => {
    setViewerVisible(false)
    setViewerUri(null)
  }, [])

  const renderAchievement = useCallback(
    ({ item }) => {
      const statusLabel = item.unlockedAt
        ? t('unlockedAt', { date: formatDate(item.unlockedAt, locale) })
        : t('locked')
      const progressLabel = item.progressTarget
        ? t('progressLabel', {
            current: item.progressCurrent,
            target: item.progressTarget,
          })
        : ''

      return (
        <AchievementRow
          badge={item.badge}
          cardStyle={cardStyle}
          criteria={item.criteria}
          id={item.$id}
          isUnlocked={item.isUnlocked}
          name={item.name}
          onPress={openAchievement}
          progressCurrent={item.progressCurrent}
          progressLabel={progressLabel}
          progressPercent={item.progressPercent}
          progressTarget={item.progressTarget}
          statusLabel={statusLabel}
        />
      )
    },
    [cardStyle, locale, openAchievement, t]
  )

  const keyExtractor = useCallback((item) => String(item.$id), [])

  return (
    <ThemedView style={styles.screen}>
      <FlatList
        data={achievements}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={(
          <>
            <Text style={styles.title}>{t('title')}</Text>

            {loading && !achievements.length ? (
              <View style={styles.stateBlock}>
                <ActivityIndicator size="small" color="#1F4D5C" />
                <Text style={styles.stateText}>{t('loading')}</Text>
              </View>
            ) : null}

            {error && !achievements.length ? (
              <View style={styles.stateBlock}>
                <Text style={styles.stateText}>{t('loadError')}</Text>
              </View>
            ) : null}
          </>
        )}
        renderItem={renderAchievement}
      />

      <Modal visible={viewerVisible} transparent onRequestClose={closeViewer}>
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalBackdrop} onPress={closeViewer} />
          <Image source={getBadgeSource(viewerUri)} style={styles.modalImage} resizeMode="contain" />
        </View>
      </Modal>
    </ThemedView>
  )
}

export default AchievementsScreen

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 28,
  },
  card: {
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 22,
  },
  row: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  rowPressed: {
    opacity: 0.88,
  },
  badgeLeft: {
    width: 104,
    alignSelf: 'stretch',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    backgroundColor: '#eee',
  },
  badgeLocked: {
    filter: [{ grayscale: 1 }],
    opacity: 0.45,
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  status: {
    color: '#6F6F6F',
    fontSize: 13,
    fontWeight: '600',
  },
  unlockedStatus: {
    color: '#1B7D4A',
  },
  criteria: {
    marginTop: 6,
    color: '#555555',
    fontSize: 13,
    lineHeight: 18,
  },
  progressBlock: {
    marginTop: 10,
    gap: 5,
  },
  progressTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: '#E6E6E6',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#C7373F',
  },
  progressText: {
    color: '#6F6F6F',
    fontSize: 12,
    fontWeight: '600',
  },
  stateBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  stateText: {
    color: '#555555',
    fontSize: 14,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalImage: {
    width: '90%',
    height: '70%',
  },
})
