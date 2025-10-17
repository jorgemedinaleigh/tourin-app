import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme, Icon } from 'react-native-paper'

/**
 * Badge
 * Pequeña tarjeta con icono, valor y etiqueta.
 *
 * Props:
 * - label: string            (ej. "Puntaje")
 * - value: number | string   (ej. 1200)
 * - icon?: string            (nombre de icono MaterialCommunityIcons, ej. "trophy")
 * - tint?: string            (color de acento; por defecto theme.colors.primary)
 * - background?: string      (fondo; por defecto elevation.level2)
 * - style?: ViewStyle        (estilos externos)
 */
const Badge = ({ label, value, icon = 'trophy', tint, background, style }) => {
  const theme = useTheme()
  const tintColor = tint || theme.colors?.primary || '#3f51b5'
  const bg = background || theme.colors?.elevation?.level2 || '#f3f4f6'
  const onBg = theme.dark ? '#fff' : '#111'

  const display = typeof value === 'number'
    ? new Intl.NumberFormat().format(value)
    : String(value ?? '')

  return (
    <View
      style={[styles.card, { backgroundColor: bg, borderColor: `${tintColor}33` }, style]}
      accessibilityRole="summary"
    >
      <View style={[styles.iconWrap]}>
        <Icon source={icon} size={30} color={tintColor} />
      </View>

      <View style={styles.texts}>
        <Text numberOfLines={1} style={[styles.value, { color: tintColor }]}>
          {display}
        </Text>
        <Text numberOfLines={1} style={[styles.label, { color: onBg, opacity: 0.7 }]}>
          {label}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
})

export default Badge
