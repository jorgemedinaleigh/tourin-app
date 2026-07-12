import { useEffect, useRef } from 'react'
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  Text,
} from 'react-native'
import { useTranslation } from 'react-i18next'

const TOTAL_MS = 1200
const DROP_MS = 520
const HIT_MS = 220
const RING_MS = 200
const FADE_MS = 260

// Overlay de animacion de sello cayendo. Usa Animated nativo y dura exactamente 1200ms.
function StampImpactOverlay({
  visible,
  stampUri,
  unlockedAchievements = [],
  accentColor = '#D93B48',
  paperColor = '#F9F1DE',
  canDismiss = false,
  onDismiss,
  onSecondaryDismiss,
  onFinish,
  onImpact,
}) {
  const { t } = useTranslation(['common', 'stampOverlay'])
  const { height } = useWindowDimensions()

  const dropY = useRef(new Animated.Value(-height * 0.85)).current
  const scale = useRef(new Animated.Value(0.9)).current
  const rotate = useRef(new Animated.Value(-10)).current
  const wobble = useRef(new Animated.Value(0)).current
  const finishCbRef = useRef(onFinish)
  const impactCbRef = useRef(onImpact)

  useEffect(() => {
    finishCbRef.current = onFinish
  }, [onFinish])

  useEffect(() => {
    impactCbRef.current = onImpact
  }, [onImpact])

  useEffect(() => {
    if (!visible) return

    dropY.setValue(-height * 0.85)
    scale.setValue(0.9)
    rotate.setValue(-10)
    wobble.setValue(0)

    const sequence = Animated.sequence([
      Animated.timing(dropY, {
        toValue: 0,
        duration: DROP_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: HIT_MS,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 0,
          duration: HIT_MS,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(wobble, {
            toValue: 1,
            duration: HIT_MS / 2,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(wobble, {
            toValue: -1,
            duration: HIT_MS / 2,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.timing(scale, {
        toValue: 1,
        duration: RING_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(FADE_MS),
    ])

    const impactTimeout = setTimeout(() => impactCbRef.current?.(), DROP_MS)
    const finishTimeout = setTimeout(() => finishCbRef.current?.(), TOTAL_MS)
    sequence.start()

    return () => {
      clearTimeout(impactTimeout)
      clearTimeout(finishTimeout)
      sequence.stop()
    }
  }, [visible, height, dropY, scale, rotate, wobble])

  if (!visible) return null

  const shake = wobble.interpolate({
    inputRange: [-1, 1],
    outputRange: [-4, 4],
  })

  const rotation = rotate.interpolate({
    inputRange: [-12, 12],
    outputRange: ['-12deg', '12deg'],
  })
  const achievements = Array.isArray(unlockedAchievements)
    ? unlockedAchievements.filter((achievement) => achievement?.$id)
    : []
  const achievementNames = achievements.map((achievement) => achievement.name).filter(Boolean).join(', ')
  const visibleAchievementBadges = achievements.slice(0, 3)
  const hiddenAchievementCount = Math.max(0, achievements.length - visibleAchievementBadges.length)

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        StyleSheet.absoluteFillObject,
        styles.overlay,
        { backgroundColor: 'rgba(0,0,0,0.55)' },
      ]}
    >
      <View style={styles.centerLayer} pointerEvents="none">
        <Animated.View
          style={[
            styles.stamp,
            {
              transform: [
                { translateY: dropY },
                { translateX: shake },
                { rotate: rotation },
                { scale },
              ],
              shadowColor: accentColor,
            },
          ]}
        >
          <Image
            source={stampUri ? { uri: stampUri } : require('../assets/icon.png')}
            style={styles.stampImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
      {canDismiss && achievements.length ? (
        <View
          style={[
            styles.unlockPanel,
            { backgroundColor: paperColor, height: height / 3 },
          ]}
        >
          <Text style={[styles.unlockTitle, { color: accentColor }]}>
            {t('stampOverlay:achievementsUnlockedTitle', { count: achievements.length })}
          </Text>
          <View style={styles.unlockBadgeRow}>
            {visibleAchievementBadges.map((achievement) => (
              <Image
                key={achievement.$id}
                source={achievement.badge ? { uri: achievement.badge } : require('../assets/icon.png')}
                style={styles.unlockBadge}
                resizeMode="cover"
              />
            ))}
            {hiddenAchievementCount > 0 ? (
              <View style={[styles.hiddenBadgeCount, { borderColor: accentColor }]}>
                <Text style={[styles.hiddenBadgeText, { color: accentColor }]}>
                  +{hiddenAchievementCount}
                </Text>
              </View>
            ) : null}
          </View>
          {achievementNames ? (
            <Text style={styles.unlockNames} numberOfLines={2}>
              {achievementNames}
            </Text>
          ) : null}
        </View>
      ) : null}
      {canDismiss ? (
        <>
        <Pressable
          style={styles.closeBtn}
          onPress={onSecondaryDismiss || onDismiss}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Pressable
          style={styles.ctaButton}
          onPress={onDismiss}
        >
          <Text style={styles.ctaText}>{t('stampOverlay:viewPassport')}</Text>
        </Pressable>
        </>
      ) : null}
    </Animated.View>
  )
}

export default StampImpactOverlay

const styles = StyleSheet.create({
  overlay: {
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLayer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  stamp: {
    width: '86%',
    maxWidth: 420,
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: '#F9F1DE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  stampImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  unlockPanel: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 106,
    alignSelf: 'center',
    maxWidth: 430,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  unlockTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  unlockBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  unlockBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFE5CF',
  },
  hiddenBadgeCount: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  hiddenBadgeText: {
    fontSize: 16,
    fontWeight: '800',
  },
  unlockNames: {
    marginTop: 8,
    color: '#2B241B',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 32,
    right: 22,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ctaButton: {
    position: 'absolute',
    bottom: 46,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
})
