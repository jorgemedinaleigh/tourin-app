import { useEffect, useRef } from 'react'
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Text,
} from 'react-native'

const TOTAL_MS = 1200
const DROP_MS = 520
const HIT_MS = 220
const RING_MS = 200
const FADE_MS = 260

// Overlay de animacion de sello cayendo. Usa Animated nativo y dura exactamente 1200ms.
function StampImpactOverlay({
  visible,
  stampUri,
  accentColor = '#D93B48',
  paperColor = '#F9F1DE',
  canDismiss = false,
  onDismiss,
  onSecondaryDismiss,
  onFinish,
  onImpact,
}) {
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
      {canDismiss ? (
        <>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onSecondaryDismiss || onDismiss}
          activeOpacity={0.7}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={onDismiss}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Ver pasaporte</Text>
        </TouchableOpacity>
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
