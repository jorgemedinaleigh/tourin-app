import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Avatar, useTheme } from 'react-native-paper'

/**
 * Nameplate
 * Muestra un banner con avatar + nombre + subtítulo (ej: email).
 *
 * Props:
 * - name: string (requerido)
 * - subtitle?: string
 * - avatarUri?: string (si existe, usa Avatar.Image; si no, Avatar.Text con iniciales)
 * - backgroundColor?: string (por defecto theme.colors.primary)
 * - style?: ViewStyle (para sobrescribir estilos externos)
 * - rightSlot?: ReactNode (opcional: botones/acciones a la derecha)
 */
const Nameplate = ({
  name,
  subtitle,
  avatarUri,
  backgroundColor,
  style,
  rightSlot,
}) => {
  const theme = useTheme()
  const bg = backgroundColor || theme.colors?.primary || '#3f51b5'
  const onPrimary = theme.colors?.onPrimary || '#fff'

  const initials = (name || 'Usuario')
    .split(/\s+/)
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <View
      accessibilityRole="header"
      style={[styles.container, { backgroundColor: bg }, style]}
    >
      {avatarUri ? (
        <Avatar.Image size={56} source={{ uri: avatarUri }} style={styles.avatar} />
      ) : (
        <Avatar.Text
          size={56}
          label={initials}
          color={onPrimary}
          style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
        />
      )}
      <View style={styles.textBlock}>
        <Text
          numberOfLines={1}
          style={[styles.name, { color: onPrimary }]}
        >
          {name || 'Usuario'}
        </Text>
        {!!subtitle && (
          <Text
            numberOfLines={1}
            style={[styles.subtitle, { color: onPrimary, opacity: 0.9 }]}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Slot opcional a la derecha (chips, botón de editar, etc.) */}
      {!!rightSlot && <View style={styles.right}>{rightSlot}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    // Sombra sutil
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  avatar: { marginRight: 12 },
  textBlock: { flex: 1, minWidth: 0 },
  name: { fontSize: 22, fontWeight: '700', letterSpacing: 0.3 },
  subtitle: { marginTop: 2 },
  right: { marginLeft: 8 },
})

export default Nameplate
