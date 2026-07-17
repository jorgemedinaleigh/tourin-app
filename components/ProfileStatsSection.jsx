import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'

export default function ProfileStatsSection() {
  const { t } = useTranslation('summaries')

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t('stats.profile.title')}</Text>
      <Pressable
        onPress={() => router.push('/dashboard/explorationStatsScreen')}
        style={({ pressed }) => [styles.statsButton, pressed && styles.pressed]}
      >
        <View style={styles.iconBadge}>
          <Ionicons color="#FFFFFF" name="stats-chart" size={19} />
        </View>
        <View style={styles.buttonCopy}>
          <Text style={styles.buttonLabel}>{t('stats.profile.action')}</Text>
          <Text style={styles.buttonDescription}>{t('stats.profile.description')}</Text>
        </View>
        <Ionicons color="#5B6572" name="chevron-forward" size={18} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  buttonCopy: {
    flex: 1,
  },
  buttonDescription: {
    color: '#68737D',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  buttonLabel: {
    color: '#25303B',
    fontSize: 15,
    fontWeight: '800',
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: '#1F4D5C',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  pressed: {
    opacity: 0.8,
  },
  section: {
    marginTop: 8,
  },
  statsButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D8D1C5',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  title: {
    color: '#2D2D2D',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
})
