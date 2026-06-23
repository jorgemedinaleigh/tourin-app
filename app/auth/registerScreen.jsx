import { useRef, useState } from 'react'
import { Keyboard, ScrollView, StyleSheet, TouchableWithoutFeedback } from 'react-native'
import { Button, Text, TextInput, HelperText } from 'react-native-paper'
import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useUser } from '../../hooks/useUser'
import { authErrorToMessage } from '../../utils/authErrorToMessage'
import ThemedView from '../../components/ThemedView'
import { posthog } from '../../lib/posthog'
import CountrySelect from '../../components/CountrySelect'
import LegalDocumentConsent from '../../components/LegalDocumentConsent'
import { COUNTRY_CODE_PATTERN, formatDateOfBirthInput, normalizeCountryCode, normalizeDateOfBirth } from '../../utils/profileDetails'

const registerScreen = () => {
  const [nameText, setNameText] = useState('')
  const [dateOfBirthText, setDateOfBirthText] = useState('')
  const [countryCodeText, setCountryCodeText] = useState('')
  const [emailText, setEmailText] = useState('')
  const [passwordText, setPasswordText] = useState('')
  const [confirmPasswordText, setConfirmPasswordText] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitLockedRef = useRef(false)

  const { register } = useUser()
  const { t, i18n } = useTranslation(['auth', 'legal'])

  const handleSubmit = async () => {
    if (submitLockedRef.current) return

    setError(null)
    setSuccessMessage(null)

    const countryCode = normalizeCountryCode(countryCodeText)
    const dateOfBirth = normalizeDateOfBirth(dateOfBirthText)

    if (!emailText.trim() || !passwordText || !nameText.trim() || !dateOfBirthText.trim() || !countryCodeText.trim()) {
      setError(t('register.missingFields'))
      posthog.capture('signup_failed', {
        error_type: 'validation',
        validation_error: 'missing_fields',
      })
      return
    }
    if (!dateOfBirth) {
      setError(t('register.invalidDateOfBirth'))
      posthog.capture('signup_failed', {
        error_type: 'validation',
        validation_error: 'invalid_date_of_birth',
      })
      return
    }
    if (!COUNTRY_CODE_PATTERN.test(countryCode)) {
      setError(t('register.invalidCountry'))
      posthog.capture('signup_failed', {
        error_type: 'validation',
        validation_error: 'invalid_country',
      })
      return
    }
    if (passwordText !== confirmPasswordText)
    {
      setError(t('register.passwordMismatch'))
      posthog.capture('signup_failed', {
        error_type: 'validation',
        validation_error: 'password_mismatch',
      })
      return
    }
    if (!termsAccepted || !privacyAccepted) {
      setError(t('legal:errors.missingConsent'))
      posthog.capture('signup_failed', {
        error_type: 'validation',
        validation_error: 'missing_legal_consent',
      })
      return
    }

    submitLockedRef.current = true
    setIsSubmitting(true)

    try {
      const response = await register(emailText, passwordText, nameText, {
        countryCode,
        dateOfBirth,
        termsAccepted,
        privacyAccepted,
      })

      setPasswordText('')
      setConfirmPasswordText('')

      if (response?.status === 'confirmation_required') {
        setSuccessMessage(t('register.confirmationRequired'))
      }
    }
    catch (err) {
      const errorMessage = authErrorToMessage(err)
      setError(errorMessage)

      // Track signup failure with error details
      posthog.capture('signup_failed', {
        error_type: 'registration',
        error_code: err?.type || err?.code || err?.status || err?.name || 'unknown',
      })

      // Capture exception for error tracking
      posthog.capture('$exception', {
        $exception_list: [
          {
            type: err?.name || 'RegistrationError',
            value: 'Registration failed',
            stacktrace: {
              type: 'raw',
              frames: err?.stack ?? '',
            },
          },
        ],
        $exception_source: 'react-native',
        screen: 'registerScreen',
      })
    } finally {
      submitLockedRef.current = false
      setIsSubmitting(false)
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
          <LegalDocumentConsent
            termsAccepted={termsAccepted}
            privacyAccepted={privacyAccepted}
            disabled={isSubmitting}
            onTermsChange={setTermsAccepted}
            onPrivacyChange={setPrivacyAccepted}
            style={styles.legalConsent}
          />
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
          <HelperText type="info" visible={!!successMessage}>
            {successMessage}
          </HelperText>

          <Button
            mode="contained"
            style={{ marginTop: 8 }}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            testID="register-button"
          >
            {t('register.submit')}
          </Button>

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
  legalConsent: {
    marginTop: 12,
  },
})
