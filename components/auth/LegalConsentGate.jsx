import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Button, HelperText, Text } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import LegalDocumentConsent from '../LegalDocumentConsent'
import ThemedView from '../ThemedView'
import { useUser } from '../../hooks/useUser'

export default function LegalConsentGate({ children }) {
  const { user, acceptLegalDocuments, logout } = useUser()
  const { t } = useTranslation(['legal', 'common'])
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const canSubmit = termsAccepted && privacyAccepted && !saving

  const handleAccept = async () => {
    if (!canSubmit) return

    setError(null)
    setSaving(true)

    try {
      await acceptLegalDocuments()
    } catch (acceptError) {
      setError(t('legal:errors.acceptFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (!user || user.legalConsent?.isCurrent) {
    return children
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.panel}>
          <Text variant="headlineSmall" style={styles.title}>
            {t('legal:gate.title')}
          </Text>
          <Text variant="bodyMedium" style={styles.copy}>
            {t('legal:gate.description')}
          </Text>
          <LegalDocumentConsent
            termsAccepted={termsAccepted}
            privacyAccepted={privacyAccepted}
            disabled={saving}
            onTermsChange={setTermsAccepted}
            onPrivacyChange={setPrivacyAccepted}
          />
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={handleAccept}
              loading={saving}
              disabled={!canSubmit}
              testID="legal-consent-accept-button"
            >
              {t('legal:gate.accept')}
            </Button>
            <Button mode="text" onPress={logout} disabled={saving}>
              {t('legal:gate.signOut')}
            </Button>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFEFEF',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderCurve: 'continuous',
    padding: 20,
    gap: 12,
  },
  title: {
    fontWeight: '700',
    color: '#1F2933',
  },
  copy: {
    color: '#5B6572',
    lineHeight: 20,
  },
  actions: {
    gap: 8,
  },
})
