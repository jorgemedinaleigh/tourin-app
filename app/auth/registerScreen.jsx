import { useState } from 'react'
import { Keyboard, StyleSheet, TouchableWithoutFeedback } from 'react-native'
import { Button, Text, TextInput, HelperText } from 'react-native-paper'
import { Link } from 'expo-router'
import { useUser } from '../../hooks/useUser'
import { appwriteErrorToMessage } from '../../utils/appwriteErrorToMessage'
import ThemedView from '../../components/ThemedView'
import { posthog } from '../../lib/posthog'

const registerScreen = () => {
  const [nameText, setNameText] = useState('')
  const [emailText, setEmailText] = useState('')
  const [passwordText, setPasswordText] = useState('')
  const [confirmPasswordText, setConfirmPasswordText] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [error, setError] = useState(null)

  const { register } = useUser()

  const handleSubmit = async () => {
    setError(null)

    if (!emailText.trim() || !passwordText || !nameText.trim()) {
      setError('Completa todos los campos para poder registrarte.');
      posthog.capture('signup_failed', {
        error_type: 'validation',
        error_message: 'Missing required fields',
      })
      return;
    }
    if (passwordText !== confirmPasswordText)
    {
      setError('La contraseña no coincide.');
      posthog.capture('signup_failed', {
        error_type: 'validation',
        error_message: 'Password mismatch',
      })
      return;
    }

    try {
      await register(emailText, passwordText, nameText)
    }
    catch (err) {
      const errorMessage = appwriteErrorToMessage(err)
      setError(errorMessage)

      // Track signup failure with error details
      posthog.capture('signup_failed', {
        error_type: 'registration',
        error_message: errorMessage,
      })

      // Capture exception for error tracking
      posthog.capture('$exception', {
        $exception_list: [
          {
            type: err.name || 'RegistrationError',
            value: err.message,
            stacktrace: {
              type: 'raw',
              frames: err.stack ?? '',
            },
          },
        ],
        $exception_source: 'react-native',
        screen: 'registerScreen',
      })
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ThemedView style={styles.container} >
        <Text variant='headlineLarge' style={styles.title} >Registra tu Cuenta</Text>

        <TextInput
          label="Nombre"
          mode="outlined"
          returnKeyType="next"
          value={nameText}
          onChangeText={setNameText}
        />
        <TextInput
          label="e-mail"
          mode="outlined"
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          value={emailText}
          onChangeText={setEmailText}
        />
        <TextInput
          label="Contraseña"
          mode="outlined"
          autoCapitalize="none"
          returnKeyType="next"
          secureTextEntry={!passwordVisible}
          right={
            <TextInput.Icon
              icon={passwordVisible ? 'eye-off' : 'eye'}
              onPress={() => setPasswordVisible((v) => !v)}
              forceTextInputFocus={false}
            />
          }
          value={passwordText}
          onChangeText={setPasswordText}
        />
        <TextInput
          label="Confirmar Contraseña"
          mode="outlined"
          autoCapitalize="none"
          secureTextEntry={!passwordVisible}
          right={
            <TextInput.Icon
              icon={passwordVisible ? 'eye-off' : 'eye'}
              onPress={() => setPasswordVisible((v) => !v)}
              forceTextInputFocus={false}
            />
          }
          value={confirmPasswordText}
          onChangeText={setConfirmPasswordText}
        />
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>

        <Button mode="contained" style={{ marginTop: 8 }} onPress={handleSubmit} testID="register-button" >Registrar</Button>

        <Link href="auth/loginScreen" style={{ marginTop: 40}} >
          <Text variant="bodyMedium" >¿Ya tienes una cuenta? Ingresa aquí</Text>
        </Link>

      </ThemedView>
    </TouchableWithoutFeedback>
  )
}

export default registerScreen

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
  },
})
