import { useState } from 'react'
import { Keyboard, StyleSheet, TouchableWithoutFeedback } from 'react-native'
import { Button, Text, TextInput, HelperText } from 'react-native-paper'
import { Link } from 'expo-router'
import { useUser } from '../../hooks/useUser'
import { appwriteErrorToMessage } from '../../utils/appwriteErrorToMessage'
import ThemedView from '../../components/ThemedView'

const loginScreen = () => {
  const [mailText, setMailText] = useState('')
  const [passwordText, setPasswordText] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [error, setError] = useState(null)

  const { login } = useUser()

   const handleSubmit = async () => {
    setError(null)

    if (!mailText.trim() || !passwordText) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    try {
      await login(mailText, passwordText)
    }
    catch (error) {
      setError(appwriteErrorToMessage(error))
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ThemedView style={styles.container} >
        <Text variant='headlineLarge' style={styles.title} >Ingresa a tu cuenta</Text>
        
        <TextInput 
          label="e-mail" 
          mode="outlined"
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          value={mailText} 
          onChangeText={setMailText}
        />
        <TextInput 
          label="Contraseña" 
          mode="outlined"
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
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>

        <Button mode="contained" style={{ marginTop: 8 }} onPress={handleSubmit} >Ingresar</Button>

        <Link href="auth/registerScreen" style={{ marginTop: 40}} >
          <Text variant="bodyMedium" >¿No tienes una cuenta? Regístrate aquí</Text>
        </Link>

      </ThemedView>
    </TouchableWithoutFeedback>
  )
}

export default loginScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
  },
})