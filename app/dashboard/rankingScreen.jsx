// rankingScreen.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native'
import { useLeaderboard } from '../../hooks/useLeaderboard'
import { useUser } from '../../hooks/useUser'
import ThemedView from '../../components/ThemedView'

const SORT_FIELDS = ['score', 'sitesVisited', 'eventsAttended']
const LABELS = {
  score: 'Puntaje',
  sitesVisited: 'Sitios',
  eventsAttended: 'Eventos',
}

export default function RankingScreen() {
  const { leaderboard, loading, error, getTop } = useLeaderboard()
  const { user } = useUser()
  const currentUserId = user?.$id

  const [sortBy, setSortBy] = useState('score')

  useEffect(() => {
    getTop({ sortBy })
  }, [sortBy])

  const changeSort = useCallback((field) => {
    setSortBy(field)
  }, [])

  const SortTabs = () => (
    <View style={styles.tabsContainer}>
      {SORT_FIELDS.map((field) => {
        const selected = sortBy === field
        return (
          <TouchableOpacity
            key={field}
            onPress={() => changeSort(field)}
            style={[styles.tab, selected && styles.tabSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Ordenar por ${LABELS[field]}`}
          >
            <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
              {LABELS[field]}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )

  const renderHeader = () => (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.colUserId, styles.headerText]}>ID</Text>
      <Text style={[styles.cell, styles.colMetric, styles.headerText, styles.right]}>
        {LABELS[sortBy]}
      </Text>
    </View>
  )

  const renderItem = ({ item }) => {
    const isMe = !!currentUserId && item?.userId === currentUserId
    const metricValue = item?.[sortBy] ?? 0
    return (
      <View style={[styles.row, isMe && styles.meRow]}>
        <Text style={[styles.cell, styles.colUserId]} numberOfLines={1}>
          {item?.userId ?? '-'}
        </Text>
        <Text style={[styles.cell, styles.colMetric, styles.right]}>
          {metricValue}
        </Text>
      </View>
    )
  }

  if (loading && leaderboard.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Cargando ranking…</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <SortTabs />
        <View style={styles.center}>
          <Text style={styles.errorText}>Ocurrió un error al cargar el ranking.</Text>
        </View>
      </View>
    )
  }

  return (
    <ThemedView style={styles.container}>
      <Text style={styles.title}>Top 100</Text>
      <SortTabs />
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
  container: { 
    padding:20 
  },
  title: {
    fontSize: 20, 
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center'
  },
  tabsContainer: { flexDirection: 'row', gap: 8, marginBottom: 5, alignItems: 'center', justifyContent: 'center', },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  tabSelected: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  tabText: { fontSize: 14 },
  tabTextSelected: { color: '#fff', fontWeight: '600' },
  arrow: { marginLeft: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  headerRow: { borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 4 },
  headerText: { fontWeight: 'bold' },
  cell: { paddingHorizontal: 6 },
  right: { textAlign: 'right' },
  colUserId: { flex: 5 },
  colMetric: { flex: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#ccc' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  loadingText: { marginTop: 8 },
  errorText: { color: 'red' },
  emptyText: { opacity: 0.6 },
  listEmptyContainer: { flexGrow: 1, justifyContent: 'center' },
  meRow: {
    backgroundColor: '#FFF7CC',
    borderRadius: 6,
  },
})
