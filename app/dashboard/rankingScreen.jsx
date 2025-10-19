import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native'
import { useLeaderboard } from '../../hooks/useLeaderboard' 
import { useUser } from '../../hooks/useUser'
import ThemedView from '../../components/ThemedView'

export default function RankingScreen() {
  const { leaderboard, loading, error, getTop } = useLeaderboard()
  const { user } = useUser()
  const [sortBy, setSortBy] = useState('score')

  const currentUserId = user?.$id

  useEffect(() => {
    getTop({ sortBy })
  }, [sortBy])

  const changeField = useCallback((field) => {
    setSortBy(field)
  }, [])

  const SortLabel = ({ label, field }) => (
    <Text style={[styles.cell, styles.headerText, styles[`col${field}`]]}>
      {label}{sortBy === field ? ' ▼' : ''}
    </Text>
  )

  const renderHeader = () => (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.coluserId, styles.headerText]}>ID</Text>

      <TouchableOpacity onPress={() => changeField('score')} style={styles.touchHeader}>
        <SortLabel label="Puntos" field="score" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => changeField('sitesVisited')} style={styles.touchHeader}>
        <SortLabel label="Sitios" field="sitesVisited" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => changeField('eventsAttended')} style={styles.touchHeader}>
        <SortLabel label="Eventos" field="eventsAttended" />
      </TouchableOpacity>
    </View>
  )

  const renderItem = ({ item }) => {
    const isMe = !!currentUserId && item?.userId === currentUserId
    return (
      <View style={[styles.row, isMe && styles.userRow ]}>
        <Text style={[styles.cell, styles.coluserId]} numberOfLines={1}>
          {
            isMe ? user?.name 
                 : item?.userId
          }
        </Text>
        <Text style={[styles.cell, styles.colscore, styles.right]}>{item?.score ?? 0}</Text>
        <Text style={[styles.cell, styles.colsitesVisited, styles.right]}>{item?.sitesVisited ?? 0}</Text>
        <Text style={[styles.cell, styles.coleventsAttended, styles.right]}>{item?.eventsAttended ?? 0}</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Cargando ranking…</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Ocurrió un error al cargar el ranking.</Text>
      </View>
    )
  }

  return (
    <ThemedView style={styles.container}>
      <Text style={styles.title}>Top 100</Text>
      {renderHeader()}
      <FlatList
        data={leaderboard}
        keyExtractor={(item, index) => item?.$id ?? item?.userId ?? String(index)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Sin datos para mostrar.</Text>
          </View>
        }
        contentContainerStyle={leaderboard.length === 0 && styles.listEmptyContainer}
        refreshing={loading}
        onRefresh={() => getTop({ sortBy })}
      />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  headerRow: { borderBottomWidth: StyleSheet.hairlineWidth },
  headerText: { fontWeight: 'bold' },
  cell: { paddingHorizontal: 6 },
  right: { textAlign: 'right' },
  coluserId: { flex: 3 },
  colscore: { flex: 1 },
  colsitesVisited: { flex: 2 },
  coleventsAttended: { flex: 2 },
  touchHeader: { flex: 0 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#ccc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8 },
  errorText: { color: 'red' },
  emptyText: { opacity: 0.6 },
  listEmptyContainer: { flexGrow: 1, justifyContent: 'center' },
  userRow: { backgroundColor: '#fde141ff', borderRadius: 6, fontWeight: 'bold', paddingVertical: 15 },
  title: {
    fontSize: 20, 
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center'
  },
})
