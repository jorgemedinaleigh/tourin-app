import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AccessibilityInfo,
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
import AchievementUnlockCelebration from './AchievementUnlockCelebration'

const TOTAL_MS = 1200
const REDUCED_TOTAL_MS = 500
const DROP_MS = 520
const HIT_MS = 220
const RING_MS = 420
const SETTLE_MS = 200
const EXIT_MS = 260

// Overlay de animacion de sello cayendo, seguido de la celebracion de logros desbloqueados.
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
  onAchievementPress,
}) {
  const { t } = useTranslation(['common', 'stampOverlay'])
  const { height } = useWindowDimensions()
  const [reducedMotion, setReducedMotion] = useState(false)
  const [celebrationComplete, setCelebrationComplete] = useState(false)

  const achievements = Array.isArray(unlockedAchievements)
    ? unlockedAchievements.filter((achievement) => achievement?.$id)
    : []
  const achievementKey = achievements.map((achievement) => achievement.$id).join('|')
  const hasAchievements = achievements.length > 0
  const finalAchievement = achievements[achievements.length - 1] || null
  const interactionsEnabled = canDismiss && (!hasAchievements || celebrationComplete)

  const dropY = useRef(new Animated.Value(-height * 0.85)).current
  const scale = useRef(new Animated.Value(0.9)).current
  const rotate = useRef(new Animated.Value(-10)).current
  const wobble = useRef(new Animated.Value(0)).current
  const stampOpacity = useRef(new Animated.Value(1)).current
  const impactPulse = useRef(new Animated.Value(0)).current
  const finishCbRef = useRef(onFinish)
  const impactCbRef = useRef(onImpact)

  useEffect(() => {
    finishCbRef.current = onFinish
  }, [onFinish])

  useEffect(() => {
    impactCbRef.current = onImpact
  }, [onImpact])

  useEffect(() => {
    let active = true

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReducedMotion(enabled)
      })
      .catch(() => {})

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion
    )

    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  useEffect(() => {
    setCelebrationComplete(false)
  }, [achievementKey, visible])

  useEffect(() => {
    if (!visible) return

    const impactMs = reducedMotion ? 180 : DROP_MS
    const totalMs = reducedMotion ? REDUCED_TOTAL_MS : TOTAL_MS

    dropY.setValue(reducedMotion ? 0 : -height * 0.85)
    scale.setValue(reducedMotion ? 0.96 : 0.9)
    rotate.setValue(reducedMotion ? 0 : -10)
    wobble.setValue(0)
    stampOpacity.setValue(reducedMotion ? 0 : 1)
    impactPulse.setValue(0)

    const sequence = reducedMotion
      ? Animated.sequence([
          Animated.parallel([
            Animated.timing(stampOpacity, {
              toValue: 1,
              duration: 220,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: 220,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(100),
          hasAchievements
            ? Animated.parallel([
                Animated.timing(stampOpacity, {
                  toValue: 0.14,
                  duration: 180,
                  useNativeDriver: true,
                }),
                Animated.timing(scale, {
                  toValue: 0.72,
                  duration: 180,
                  useNativeDriver: true,
                }),
              ])
            : Animated.delay(180),
        ])
      : Animated.sequence([
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
            duration: SETTLE_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          hasAchievements
            ? Animated.parallel([
                Animated.timing(dropY, {
                  toValue: -height * 0.22,
                  duration: EXIT_MS,
                  easing: Easing.inOut(Easing.quad),
                  useNativeDriver: true,
                }),
                Animated.timing(scale, {
                  toValue: 0.58,
                  duration: EXIT_MS,
                  easing: Easing.inOut(Easing.quad),
                  useNativeDriver: true,
                }),
                Animated.timing(stampOpacity, {
                  toValue: 0.14,
                  duration: EXIT_MS,
                  useNativeDriver: true,
                }),
              ])
            : Animated.delay(EXIT_MS),
        ])

    const impactAnimation = Animated.timing(impactPulse, {
      toValue: 1,
      duration: RING_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    })
    const impactTimeout = setTimeout(() => {
      if (!reducedMotion) impactAnimation.start()
      impactCbRef.current?.()
    }, impactMs)
    const finishTimeout = setTimeout(() => finishCbRef.current?.(), totalMs)

    sequence.start()

    return () => {
      clearTimeout(impactTimeout)
      clearTimeout(finishTimeout)
      sequence.stop()
      impactAnimation.stop()
    }
  }, [
    visible,
    height,
    hasAchievements,
    reducedMotion,
    dropY,
    impactPulse,
    rotate,
    scale,
    stampOpacity,
    wobble,
  ])

  const handleCelebrationComplete = useCallback(() => {
    setCelebrationComplete(true)
  }, [])

  if (!visible) return null

  const shake = wobble.interpolate({
    inputRange: [-1, 1],
    outputRange: [-4, 4],
  })
  const rotation = rotate.interpolate({
    inputRange: [-12, 12],
    outputRange: ['-12deg', '12deg'],
  })
  const ringOpacity = impactPulse.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0, 0.76, 0],
  })
  const outerRingOpacity = impactPulse.interpolate({
    inputRange: [0, 0.28, 1],
    outputRange: [0, 0.5, 0],
  })
  const ringScale = impactPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.62, 1.32],
  })
  const outerRingScale = impactPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.54, 1.56],
  })

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        StyleSheet.absoluteFillObject,
        styles.overlay,
        { backgroundColor: 'rgba(0,0,0,0.68)' },
      ]}
    >
      <View style={styles.centerLayer} pointerEvents="none">
        {!reducedMotion ? (
          <>
            <Animated.View
              style={[
                styles.impactRing,
                {
                  borderColor: accentColor,
                  opacity: outerRingOpacity,
                  transform: [{ scale: outerRingScale }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.impactRing,
                {
                  borderColor: paperColor,
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
          </>
        ) : null}
        <Animated.View
          style={[
            styles.stamp,
            {
              opacity: stampOpacity,
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

      {hasAchievements ? (
        <AchievementUnlockCelebration
          achievements={achievements}
          accentColor={accentColor}
          paperColor={paperColor}
          reducedMotion={reducedMotion}
          visible={canDismiss}
          onComplete={handleCelebrationComplete}
          onAchievementPress={onAchievementPress}
        />
      ) : null}

      {interactionsEnabled ? (
        <>
          <Pressable
            accessibilityRole="button"
            style={styles.closeBtn}
            onPress={onSecondaryDismiss || onDismiss}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
            onPress={
              hasAchievements
                ? () => onAchievementPress?.(finalAchievement)
                : onDismiss
            }
          >
            <Text style={styles.ctaText}>
              {hasAchievements
                ? t('stampOverlay:viewAchievements')
                : t('stampOverlay:viewPassport')}
            </Text>
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
  impactRing: {
    position: 'absolute',
    width: '80%',
    maxWidth: 410,
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 7,
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
  closeBtn: {
    position: 'absolute',
    top: 32,
    right: 22,
    zIndex: 4,
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
    zIndex: 4,
    alignSelf: 'center',
    minWidth: 190,
    paddingHorizontal: 22,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  ctaButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
})
