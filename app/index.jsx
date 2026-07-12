import { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { Image, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { useUser } from '../hooks/useUser'
import LoadingScreen from '../components/LoadingScreen'
import ThemedView from '../components/ThemedView'

const Index = () => {
  const { user, authChecked, markWelcomeSeen } = useUser()
  const router = useRouter()
  const { t } = useTranslation('home')
  const [isEntering, setIsEntering] = useState(false)

  useEffect(() => {
    if (!authChecked) return

    if (!user) {
      router.replace('/auth/loginScreen')
    } else if (user.hasSeenWelcome) {
      router.replace('/dashboard/mapScreen')
    }
  }, [authChecked, router, user])

  const handleEnter = async () => {
    if (!user || isEntering) return

    setIsEntering(true)
    try {
      await markWelcomeSeen()
      router.replace('/dashboard/mapScreen')
    } catch (error) {
      console.warn('Failed to save welcome screen completion', error)
      setIsEntering(false)
    }
  }

  if (!authChecked || !user || user.hasSeenWelcome) {
    return <LoadingScreen />
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Text variant="displaySmall" style={styles.title}>{t('title')}</Text>
        <Image source={require('../assets/tourin_icon.png')} style={styles.logo} />
        <Text variant="displaySmall" style={styles.body}>{t('body')}</Text>
      </View>
      <Button
        mode="contained"
        style={styles.button}
        onPress={handleEnter}
        loading={isEntering}
        disabled={isEntering}
      >
        {t('enter')}
      </Button>
    </ThemedView>
  )
}

export default Index

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 250,
    height: 250,
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  body: {
    fontWeight: '200',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  button: {
    marginTop: 28,
    alignSelf: 'stretch',
  },
})
