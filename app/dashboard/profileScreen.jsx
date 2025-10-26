import { StyleSheet, Text, View } from 'react-native'
import { Button, useTheme } from 'react-native-paper'
import { useUser } from '../../hooks/useUser'
import { useStats } from '../../hooks/useStats'
import { router, useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import ThemedView from '../../components/ThemedView'
import Nameplate from '../../components/Nameplate'
import Badge from '../../components/Badge'

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
          label="Puntaje"
          value={stats?.score ?? 0}
          icon="podium"
          tint={theme.colors.primary}
          style={{ marginRight: 12 }}
          onPress={() => router.push('dashboard/rankingScreen')}
        />
        <Badge 
          label="Logros"
          value={stats?.achivementsUnlocked ?? 0}
          icon="trophy-award"
          tint={theme.colors.success || theme.colors.primary}
          onPress={() => router.push('dashboard/achievementsScreen')}
        />
      </View >
      <View style={styles.badgesRow}>
        <Badge
          label="Sitios"
          value={stats?.sitesVisited ?? 0}
          icon="map-marker"
          tint={theme.colors.tertiary || theme.colors.primary}
          style={{ marginRight: 12 }}
          onPress={() => router.push('dashboard/passportScreen')}
        />
        <Badge
          label="Eventos"
          value={stats?.eventsAttended ?? 0}
          icon="calendar-check"
          tint={theme.colors.secondary || theme.colors.primary}
        />
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
})