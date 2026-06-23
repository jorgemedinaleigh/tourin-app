import { Linking, StyleSheet, View } from 'react-native'
import { Checkbox, Text } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { LEGAL_PRIVACY_URL, LEGAL_TERMS_URL } from '../lib/legalDocuments'

const openLegalDocument = async (url) => {
  try {
    await Linking.openURL(url)
  } catch (error) {
    console.warn('Failed to open legal document', error)
  }
}

const LegalConsentRow = ({
  checked,
  disabled,
  labelPrefix,
  linkLabel,
  url,
  onToggle,
}) => (
  <View style={[styles.row, disabled ? styles.rowDisabled : null]}>
    <Checkbox
      status={checked ? 'checked' : 'unchecked'}
      disabled={disabled}
      onPress={onToggle}
    />
    <Text style={styles.label} onPress={disabled ? undefined : onToggle}>
      {labelPrefix}{' '}
      <Text style={styles.link} onPress={() => openLegalDocument(url)}>
        {linkLabel}
      </Text>
    </Text>
  </View>
)

export default function LegalDocumentConsent({
  termsAccepted,
  privacyAccepted,
  disabled = false,
  onTermsChange,
  onPrivacyChange,
  style,
}) {
  const { t } = useTranslation('legal')

  return (
    <View style={[styles.container, style]}>
      <LegalConsentRow
        checked={termsAccepted}
        disabled={disabled}
        labelPrefix={t('termsCheckboxPrefix')}
        linkLabel={t('termsLinkLabel')}
        url={LEGAL_TERMS_URL}
        onToggle={() => onTermsChange(!termsAccepted)}
      />
      <LegalConsentRow
        checked={privacyAccepted}
        disabled={disabled}
        labelPrefix={t('privacyCheckboxPrefix')}
        linkLabel={t('privacyLinkLabel')}
        url={LEGAL_PRIVACY_URL}
        onToggle={() => onPrivacyChange(!privacyAccepted)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#D8DEE6',
    borderRadius: 8,
    borderCurve: 'continuous',
    paddingVertical: 8,
    paddingRight: 12,
    backgroundColor: '#FFFFFF',
  },
  rowDisabled: {
    opacity: 0.72,
  },
  label: {
    flex: 1,
    paddingTop: 8,
    color: '#25303B',
    lineHeight: 20,
  },
  link: {
    color: '#1F4D5C',
    fontWeight: '700',
  },
})
