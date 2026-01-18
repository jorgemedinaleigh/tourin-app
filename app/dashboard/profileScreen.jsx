import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Button, useTheme } from 'react-native-paper'
import { useUser } from '../../hooks/useUser'
import { useStats } from '../../hooks/useStats'
import { router, useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { Ionicons } from '@expo/vector-icons'
import ThemedView from '../../components/ThemedView'
import Nameplate from '../../components/Nameplate'
import Badge from '../../components/Badge'

const PASSPORT_LINK = 'https://tourin.app/passport-placeholder'

const profileScreen = () => {
  const { logout, user } = useUser()
  const { stats, getStats } = useStats(user.$id)
  const theme = useTheme()

  const displayName = user?.name || 'Usuario'

  useFocusEffect(
    useCallback(() => {
      if(user?.$id) {
        getStats()
      }
    }, [user?.$id])
  )

  const sharePassportLink = useCallback(async () => {
    try {
      await Share.share({
        title: 'Pasaporte TourIn',
        message: `Mira mi pasaporte TourIn:\n${PASSPORT_LINK}`,
        url: PASSPORT_LINK,
      })
    } catch (error) {
      console.log('Error al compartir pasaporte:', error)
      Alert.alert('Error', 'No se pudo compartir el pasaporte.')
    }
  }, [])

  return (
    <ThemedView style={{ padding: 20 }} safe>
      <Text style={styles.title}>Perfil</Text>

      <Nameplate
        name={displayName}
        subtitle={user?.email}
        avatarUri={user?.photoUrl}
        backgroundColor={theme.colors.primary}
      />

      <View style={styles.badgesRow}>
        <Badge
          label="Sitios"
          value={stats?.sitesVisited ?? 0}
          icon="map-marker"
          tint={theme.colors.tertiary || theme.colors.primary}
          style={{ marginRight: 5 }}
          onPress={() => router.push('dashboard/passportScreen')}
        />
        <Badge
          label="Eventos"
          value={stats?.eventsAttended ?? 0}
          icon="calendar-check"
          tint={theme.colors.secondary || theme.colors.primary}
          style={{ marginRight: 5 }}
        />
        <Badge 
          label="Logros"
          value={stats?.achivementsUnlocked ?? 0}
          icon="trophy-award"
          tint={theme.colors.success || theme.colors.primary}
          onPress={() => router.push('dashboard/achievementsScreen')}
        />
      </View>

      <View style={styles.shareLinkRow}>
        <TouchableOpacity
          style={styles.shareLinkButton}
          onPress={sharePassportLink}
          activeOpacity={0.8}
        >
          <Ionicons name="share-social" size={18} color="#3C3A32" style={styles.shareButtonIcon} />
          <Text style={styles.shareLinkText}>Compartir</Text>
        </TouchableOpacity>
      </View>

      <Button 
        mode="contained-tonal" 
        icon={"logout"}
        buttonColor="#ff2c2cff" 
        textColor="#ffffffff"
        onPress={logout}
      >
        Desconectar Cuenta
      </Button>
    </ThemedView>
  )
}

export default profileScreen

const styles = StyleSheet.create({
  title: {
    fontSize: 20, 
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center'
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 16,
  },
  shareLinkRow: {
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  shareLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginRight: 12,
  },
  shareLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3C3A32',
  },
  shareButtonIcon: {
    marginRight: 6,
  },
})
