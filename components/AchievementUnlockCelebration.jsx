import { useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Line, Polygon } from 'react-native-svg'
import { useTranslation } from 'react-i18next'

const FALLBACK_BADGE = require('../assets/icon.png')
const BURST_CENTER = 180
const RAY_COUNT = 18
const NORMAL_ITEM_MS = 1650
const REDUCED_ITEM_MS = 1100
const NORMAL_FINAL_MS = 1400
const REDUCED_FINAL_MS = 500

const RAYS = Array.from({ length: RAY_COUNT }, (_, index) => {
  const angle = (index / RAY_COUNT) * Math.PI * 2
  const innerRadius = index % 2 === 0 ? 84 : 102
  const outerRadius = index % 3 === 0 ? 166 : 146

  return {
    x1: BURST_CENTER + Math.cos(angle) * innerRadius,
    y1: BURST_CENTER + Math.sin(angle) * innerRadius,
    x2: BURST_CENTER + Math.cos(angle) * outerRadius,
    y2: BURST_CENTER + Math.sin(angle) * outerRadius,
  }
})

const DIAMONDS = Array.from({ length: 10 }, (_, index) => {
  const angle = ((index + 0.5) / 10) * Math.PI * 2
  const radius = index % 2 === 0 ? 154 : 132
  const x = BURST_CENTER + Math.cos(angle) * radius
  const y = BURST_CENTER + Math.sin(angle) * radius
  const size = index % 2 === 0 ? 7 : 5

  return `${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`
})

function AchievementUnlockCelebration({
  achievements = [],
  accentColor = '#C7373F',
  paperColor = '#F9F1DE',
  reducedMotion = false,
  visible = false,
  onComplete,
  onAchievementPress,
}) {
  const { t } = useTranslation('stampOverlay')
  const { height, width } = useWindowDimensions()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [interactionEnabled, setInteractionEnabled] = useState(false)
  const completionRef = useRef(onComplete)

  const burstProgress = useSharedValue(0)
  const badgeOpacity = useSharedValue(0)
  const badgeScale = useSharedValue(reducedMotion ? 0.94 : 0.12)
  const badgeRotation = useSharedValue(reducedMotion ? 0 : -18)
  const copyProgress = useSharedValue(0)
  const shineProgress = useSharedValue(0)

  const achievementKey = useMemo(
    () => achievements.map((achievement) => achievement?.$id).filter(Boolean).join('|'),
    [achievements]
  )
  const currentAchievement = achievements[currentIndex] || null
  const isLastAchievement = currentIndex >= achievements.length - 1
  const badgeSize = Math.min(width * 0.52, height * 0.3, 230)
  const burstSize = Math.min(Math.max(width * 1.16, 390), 680)

  useEffect(() => {
    completionRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (!visible || !achievementKey) {
      setCurrentIndex(0)
      setInteractionEnabled(false)
      return
    }

    setCurrentIndex(0)
    setInteractionEnabled(false)
  }, [achievementKey, visible])

  useEffect(() => {
    if (!visible || !currentAchievement) return

    const isLast = currentIndex >= achievements.length - 1
    const itemDuration = reducedMotion ? REDUCED_ITEM_MS : NORMAL_ITEM_MS
    const finalDuration = reducedMotion ? REDUCED_FINAL_MS : NORMAL_FINAL_MS

    burstProgress.value = 0
    badgeOpacity.value = 0
    badgeScale.value = reducedMotion ? 0.94 : 0.12
    badgeRotation.value = reducedMotion ? 0 : -18
    copyProgress.value = 0
    shineProgress.value = 0
    setInteractionEnabled(false)

    if (reducedMotion) {
      badgeOpacity.value = isLast
        ? withTiming(1, { duration: 220 })
        : withSequence(
            withTiming(1, { duration: 220 }),
            withDelay(650, withTiming(0, { duration: 150 }))
          )
      badgeScale.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) })
      copyProgress.value = isLast
        ? withDelay(100, withTiming(1, { duration: 220 }))
        : withSequence(
            withDelay(100, withTiming(1, { duration: 220 })),
            withDelay(550, withTiming(0, { duration: 150 }))
          )
    } else {
      burstProgress.value = withTiming(1, {
        duration: 920,
        easing: Easing.out(Easing.cubic),
      })
      badgeOpacity.value = isLast
        ? withDelay(80, withTiming(1, { duration: 180 }))
        : withSequence(
            withDelay(80, withTiming(1, { duration: 180 })),
            withDelay(1050, withTiming(0, { duration: 180 }))
          )
      badgeScale.value = withDelay(
        70,
        withSpring(1, {
          damping: 8,
          mass: 0.7,
          stiffness: 145,
        })
      )
      badgeRotation.value = withDelay(
        80,
        withSpring(0, {
          damping: 9,
          stiffness: 125,
        })
      )
      copyProgress.value = isLast
        ? withDelay(350, withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) }))
        : withSequence(
            withDelay(350, withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) })),
            withDelay(680, withTiming(0, { duration: 180 }))
          )
      shineProgress.value = withDelay(
        480,
        withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) })
      )
    }

    const hapticTimeout = setTimeout(() => {
      if (currentIndex === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      }
    }, reducedMotion ? 80 : 150)

    const announcementTimeout = setTimeout(() => {
      const announcement = [
        t('achievementsUnlockedTitle', { count: achievements.length }),
        currentAchievement.name,
      ].filter(Boolean).join('. ')
      AccessibilityInfo.announceForAccessibility(announcement)
    }, reducedMotion ? 180 : 500)

    const advanceTimeout = setTimeout(() => {
      if (isLast) {
        setInteractionEnabled(true)
        completionRef.current?.()
        return
      }
      setCurrentIndex((index) => index + 1)
    }, isLast ? finalDuration : itemDuration)

    return () => {
      clearTimeout(hapticTimeout)
      clearTimeout(announcementTimeout)
      clearTimeout(advanceTimeout)
      cancelAnimation(burstProgress)
      cancelAnimation(badgeOpacity)
      cancelAnimation(badgeScale)
      cancelAnimation(badgeRotation)
      cancelAnimation(copyProgress)
      cancelAnimation(shineProgress)
    }
  }, [
    achievements.length,
    badgeOpacity,
    badgeRotation,
    badgeScale,
    burstProgress,
    copyProgress,
    currentAchievement,
    currentIndex,
    reducedMotion,
    shineProgress,
    t,
    visible,
  ])

  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      burstProgress.value,
      [0, 0.08, 0.7, 1],
      [0, 1, 0.9, 0],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        scale: interpolate(
          burstProgress.value,
          [0, 0.55, 1],
          [0.22, 1.05, 1.28],
          Extrapolation.CLAMP
        ),
      },
      {
        rotate: `${interpolate(
          burstProgress.value,
          [0, 1],
          [-14, 12],
          Extrapolation.CLAMP
        )}deg`,
      },
    ],
  }))

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [
      { scale: badgeScale.value },
      { rotate: `${badgeRotation.value}deg` },
    ],
  }))

  const copyStyle = useAnimatedStyle(() => ({
    opacity: copyProgress.value,
    transform: [
      {
        translateY: interpolate(
          copyProgress.value,
          [0, 1],
          [26, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
  }))

  const shineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      shineProgress.value,
      [0, 0.15, 0.75, 1],
      [0, 0.78, 0.48, 0],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        translateX: interpolate(
          shineProgress.value,
          [0, 1],
          [-badgeSize * 1.1, badgeSize * 1.1],
          Extrapolation.CLAMP
        ),
      },
      { rotate: '18deg' },
    ],
  }))

  if (!visible || !currentAchievement) return null

  return (
    <View pointerEvents="box-none" style={styles.root}>
      {!reducedMotion ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.burst,
            { height: burstSize, width: burstSize },
            burstStyle,
          ]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 360 360">
            <Circle
              cx={BURST_CENTER}
              cy={BURST_CENTER}
              r="73"
              fill="none"
              stroke={accentColor}
              strokeWidth="5"
              opacity="0.8"
            />
            <Circle
              cx={BURST_CENTER}
              cy={BURST_CENTER}
              r="92"
              fill="none"
              stroke="#F5C451"
              strokeDasharray="8 10"
              strokeWidth="4"
              opacity="0.9"
            />
            {RAYS.map((ray, index) => (
              <Line
                key={`ray-${index}`}
                x1={ray.x1}
                y1={ray.y1}
                x2={ray.x2}
                y2={ray.y2}
                stroke={index % 2 === 0 ? accentColor : '#F5C451'}
                strokeLinecap="round"
                strokeWidth={index % 3 === 0 ? 7 : 4}
              />
            ))}
            {DIAMONDS.map((points, index) => (
              <Polygon
                key={`diamond-${index}`}
                points={points}
                fill={index % 2 === 0 ? '#F5C451' : paperColor}
                stroke={index % 2 === 0 ? paperColor : accentColor}
                strokeWidth="2"
              />
            ))}
          </Svg>
        </Animated.View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[currentAchievement.name, t('viewAchievements')].filter(Boolean).join('. ')}
        disabled={!interactionEnabled}
        onPress={() => onAchievementPress?.(currentAchievement)}
        style={styles.achievementPressable}
      >
        <Animated.View style={[styles.achievementContent, badgeStyle]}>
          <View
            style={[
              styles.badgeFrame,
              {
                backgroundColor: paperColor,
                borderColor: accentColor,
                height: badgeSize,
                width: badgeSize,
              },
            ]}
          >
            <Image
              source={currentAchievement.badge ? { uri: currentAchievement.badge } : FALLBACK_BADGE}
              style={styles.badgeImage}
              resizeMode="contain"
            />
            {!reducedMotion ? (
              <Animated.View pointerEvents="none" style={[styles.badgeShine, shineStyle]} />
            ) : null}
          </View>
        </Animated.View>

        <Animated.View style={[styles.copyBlock, copyStyle]}>
          <Text style={[styles.unlockTitle, { color: accentColor }]}>
            {t('achievementsUnlockedTitle', { count: achievements.length })}
          </Text>
          <Text style={styles.achievementName} numberOfLines={2}>
            {currentAchievement.name}
          </Text>
          {achievements.length > 1 ? (
            <Text style={styles.progressText}>
              {currentIndex + 1} / {achievements.length}
            </Text>
          ) : null}
        </Animated.View>
      </Pressable>
    </View>
  )
}

export default AchievementUnlockCelebration

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
    paddingBottom: 132,
    paddingHorizontal: 24,
    zIndex: 2,
  },
  burst: {
    position: 'absolute',
    alignSelf: 'center',
  },
  achievementPressable: {
    width: '100%',
    maxWidth: 460,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeFrame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.42,
    shadowRadius: 20,
    elevation: 18,
  },
  badgeImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  badgeShine: {
    position: 'absolute',
    top: '-20%',
    bottom: '-20%',
    left: '40%',
    width: '22%',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  copyBlock: {
    minHeight: 112,
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(249,241,222,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.68)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
    elevation: 10,
  },
  unlockTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  achievementName: {
    marginTop: 7,
    color: '#2B241B',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    textAlign: 'center',
  },
  progressText: {
    marginTop: 7,
    color: '#6A5C4A',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
})
