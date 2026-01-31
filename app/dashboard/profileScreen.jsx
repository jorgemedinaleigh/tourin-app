import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from 'react-native-paper'
import { useUser } from '../../hooks/useUser'
import { useStats } from '../../hooks/useStats'
import { router, useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { Ionicons } from '@expo/vector-icons'
import ThemedView from '../../components/ThemedView'

const profileScreen = () => {
  const { user } = useUser()
  const { stats, getStats } = useStats(user.$id)
  const theme = useTheme()

  const displayName = user?.name || 'Usuario'
  const handle = user?.email ? user.email.split('@')[0] : 'usuario'
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  const createdAtDate = user?.$createdAt ? new Date(user.$createdAt) : null
  const joinDate = createdAtDate
    ? `${monthNames[createdAtDate.getMonth()]} ${createdAtDate.getFullYear()}`
    : 'Enero 2026'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  useFocusEffect(
    useCallback(() => {
      if(user?.$id) {
        getStats()
      }
    }, [user?.$id])
  )

  return (
    <ThemedView style={styles.container} safe>
      <View style={styles.profileCard}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={[styles.settingsButton, styles.raised]} disabled>
            <Ionicons name="settings" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.flagEmoji}>🇨🇱</Text>
          <Text style={styles.nameText}>{displayName}</Text>
        </View>
        <Text style={styles.handleText}>@{handle} desde {joinDate}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.addFriendButton, styles.raised]} disabled activeOpacity={1}>
            <Ionicons name="person-add" size={16} color={theme.colors.primary} style={styles.addFriendIcon} />
            <Text style={styles.addFriendText}>AGREGA AMIGOS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareIconButton, styles.raised]} disabled activeOpacity={1}>
            <Ionicons name="share-social" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Resumen</Text>

      <TouchableOpacity
        style={[styles.summaryCard, styles.raised]}
        onPress={() => router.push('dashboard/passportScreen')}
        activeOpacity={0.8}
      >
        <View style={styles.summaryIcon}>
          <Ionicons name="location" size={18} color="#6f6f6f" />
        </View>
        <Text style={styles.summaryText}>{stats?.sitesVisited ?? 0} sitios</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.summaryCard, styles.raised]} disabled activeOpacity={1}>
        <View style={styles.summaryIcon}>
          <Ionicons name="calendar" size={18} color="#6f6f6f" />
        </View>
        <Text style={styles.summaryText}>{stats?.eventsAttended ?? 0} eventos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.summaryCard, styles.raised]}
        onPress={() => router.push('dashboard/achievementsScreen')}
        activeOpacity={0.8}
      >
        <View style={styles.summaryIcon}>
          <Ionicons name="trophy" size={18} color="#6f6f6f" />
        </View>
        <Text style={styles.summaryText}>{stats?.achivementsUnlocked ?? 0} logros</Text>
      </TouchableOpacity>
    </ThemedView>
  )
}

export default profileScreen

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#EFEFEF',
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#E6E6E6',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: '#E0E0E0',
    backgroundColor: '#36B38D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: '#F4C8C1',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '700',
    color: '#7A4B46',
  },
  settingsButton: {
    position: 'absolute',
    right: -10,
    top: 60,
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#4CAF7D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F5F5F5',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  flagEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  nameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#303030',
  },
  handleText: {
    fontSize: 13,
    color: '#6A6A6A',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D6D6D6',
    flex: 1,
    justifyContent: 'center',
  },
  addFriendIcon: {
    marginRight: 6,
  },
  addFriendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A9CD6',
    letterSpacing: 0.3,
  },
  shareIconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6D6D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    color: '#2D2D2D',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
  },
})
