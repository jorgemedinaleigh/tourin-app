import { useState } from 'react'
import { Keyboard, StyleSheet, TouchableWithoutFeedback } from 'react-native'
import { Button, HelperText, Text, TextInput } from 'react-native-paper'
import { Link, router, useLocalSearchParams } from 'expo-router'
import { useUser } from '../../hooks/useUser'
import { authErrorToMessage } from '../../utils/authErrorToMessage'
import ThemedView from '../../components/ThemedView'

const ConfirmSignUpScreen = () => {
  const params = useLocalSearchParams()
  const [codeText, setCodeText] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const { confirmRegistration } = useUser()
  const email = typeof params.email === 'string' ? params.email : ''

  const handleSubmit = async () => {
    setError(null)

    if (!email.trim() || !codeText.trim()) {
      setError('Ingresa el código de confirmación.')
      return
    }

    setLoading(true)
    try {
      await confirmRegistration(email, codeText)
      router.replace('/auth/loginScreen')
    } catch (err) {
      setError(authErrorToMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ThemedView style={styles.container}>
        <Text variant="headlineLarge" style={styles.title}>Confirma tu cuenta</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Ingresa el código enviado a {email || 'tu correo'}.
        </Text>

        <TextInput
          label="Código"
          mode="outlined"
          keyboardType="number-pad"
          value={codeText}
          onChangeText={setCodeText}
        />
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>

        <Button mode="contained" style={{ marginTop: 8 }} onPress={handleSubmit} loading={loading} disabled={loading}>
          Confirmar
        </Button>

        <Link href="/auth/loginScreen" style={{ marginTop: 40 }}>
          <Text variant="bodyMedium">Volver al inicio de sesión</Text>
        </Link>
      </ThemedView>
    </TouchableWithoutFeedback>
  )
}

export default ConfirmSignUpScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
})
