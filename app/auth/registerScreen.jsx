import { useState } from 'react'
import { Keyboard, ScrollView, StyleSheet, TouchableWithoutFeedback } from 'react-native'
import { Button, Text, TextInput, HelperText } from 'react-native-paper'
import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useUser } from '../../hooks/useUser'
import { authErrorToMessage } from '../../utils/authErrorToMessage'
import ThemedView from '../../components/ThemedView'
import { posthog } from '../../lib/posthog'
import CountrySelect from '../../components/CountrySelect'
import { COUNTRY_CODE_PATTERN, formatDateOfBirthInput, normalizeCountryCode, normalizeDateOfBirth } from '../../utils/profileDetails'

const registerScreen = () => {
  const [nameText, setNameText] = useState('')
  const [dateOfBirthText, setDateOfBirthText] = useState('')
  const [countryCodeText, setCountryCodeText] = useState('')
  const [emailText, setEmailText] = useState('')
  const [passwordText, setPasswordText] = useState('')
  const [confirmPasswordText, setConfirmPasswordText] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [error, setError] = useState(null)

  const { register } = useUser()
  const { t, i18n } = useTranslation('auth')

  const handleSubmit = async () => {
    setError(null)

    const countryCode = normalizeCountryCode(countryCodeText)
    const dateOfBirth = normalizeDateOfBirth(dateOfBirthText)

    if (!emailText.trim() || !passwordText || !nameText.trim() || !dateOfBirthText.trim() || !countryCodeText.trim()) {
      setError(t('register.missingFields'));
      posthog.capture('signup_failed', {
        error_type: 'validation',
        error_message: 'Missing required fields',
      })
      return;
    }
    if (!dateOfBirth) {
      setError(t('register.invalidDateOfBirth'));
      posthog.capture('signup_failed', {
        error_type: 'validation',
        error_message: 'Invalid date of birth',
      })
      return;
    }
    if (!COUNTRY_CODE_PATTERN.test(countryCode)) {
      setError(t('register.invalidCountry'));
      posthog.capture('signup_failed', {
        error_type: 'validation',
        error_message: 'Invalid country',
      })
      return;
    }
    if (passwordText !== confirmPasswordText)
    {
      setError(t('register.passwordMismatch'));
      posthog.capture('signup_failed', {
        error_type: 'validation',
        error_message: 'Password mismatch',
      })
      return;
    }

    try {
      await register(emailText, passwordText, nameText, {
        countryCode,
        dateOfBirth,
      })
    }
    catch (err) {
      const errorMessage = authErrorToMessage(err)
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
      <ThemedView>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant='headlineLarge' style={styles.title} >{t('register.title')}</Text>

          <TextInput
            label={t('nameLabel')}
            mode="outlined"
            returnKeyType="next"
            value={nameText}
            onChangeText={setNameText}
          />
          <TextInput
            label={t('dateOfBirthLabel')}
            mode="outlined"
            keyboardType="numeric"
            maxLength={10}
            placeholder={t('dateOfBirthPlaceholder')}
            returnKeyType="next"
            value={dateOfBirthText}
            onChangeText={(value) => setDateOfBirthText(formatDateOfBirthInput(value))}
          />
          <CountrySelect
            label={t('countryLabel')}
            locale={i18n.language}
            modalTitle={t('countrySelectTitle')}
            onSelect={setCountryCodeText}
            placeholder={t('countryPlaceholder')}
            value={countryCodeText}
          />
          <TextInput
            label={t('emailLabel')}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            value={emailText}
            onChangeText={setEmailText}
          />
          <TextInput
            label={t('passwordLabel')}
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
            label={t('repeatPasswordLabel')}
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

          <Button mode="contained" style={{ marginTop: 8 }} onPress={handleSubmit} testID="register-button" >{t('register.submit')}</Button>

          <Link href="auth/loginScreen" style={{ marginTop: 40}} >
            <Text variant="bodyMedium" >{t('haveAccount')}</Text>
          </Link>

        </ScrollView>
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
