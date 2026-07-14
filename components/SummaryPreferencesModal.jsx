import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  ActivityIndicator,
  Button,
  HelperText,
  Modal,
  Portal,
  Switch,
  TextInput,
} from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { useSummaryPreferences } from '../hooks/useSummaryPreferences'
import { isValidNotificationTime } from '../lib/summaryPeriods'

const PreferenceToggle = ({ description, label, onChange, value }) => (
  <View style={styles.toggleRow}>
    <View style={styles.toggleCopy}>
      <Text style={styles.toggleLabel}>{label}</Text>
      {!!description && <Text style={styles.toggleDescription}>{description}</Text>}
    </View>
    <Switch value={value} onValueChange={onChange} />
  </View>
)

export default function SummaryPreferencesModal({ onDismiss, userId, visible }) {
  const { t } = useTranslation(['common', 'summaries'])
  const {
    loading,
    preferences,
    savePreferences,
    saving,
  } = useSummaryPreferences(userId)
  const [form, setForm] = useState(preferences)
  const [formError, setFormError] = useState(null)
  const [permissionWarning, setPermissionWarning] = useState(false)

  useEffect(() => {
    if (visible) {
      setForm(preferences)
      setFormError(null)
      setPermissionWarning(false)
    }
  }, [preferences, visible])

  const updateForm = (patch) => setForm((current) => ({ ...current, ...patch }))

  const handleSave = async () => {
    setFormError(null)
    setPermissionWarning(false)

    if (
      (form.activeDayEnabled && !isValidNotificationTime(form.activeDayTime)) ||
      (form.weeklyEnabled && !isValidNotificationTime(form.weeklyTime))
    ) {
      setFormError(t('summaries:preferences.invalidTime'))
      return
    }

    try {
      const result = await savePreferences(form)
      if (
        (form.activeDayEnabled || form.weeklyEnabled) &&
        result?.notificationStatus !== 'granted'
      ) {
        setPermissionWarning(true)
        return
      }
      onDismiss?.()
    } catch {
      setFormError(t('summaries:preferences.saveError'))
    }
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Text style={styles.title}>{t('summaries:preferences.title')}</Text>
        <Text style={styles.description}>{t('summaries:preferences.description')}</Text>

        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <>
            <PreferenceToggle
              label={t('summaries:preferences.activeDayNotifications')}
              description={t('summaries:activeDay.notificationDescription')}
              value={form.activeDayEnabled}
              onChange={(activeDayEnabled) => updateForm({ activeDayEnabled })}
            />
            <TextInput
              disabled={!form.activeDayEnabled}
              label={t('summaries:preferences.timeLabel')}
              mode="outlined"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              placeholder="09:00"
              value={form.activeDayTime}
              onChangeText={(activeDayTime) => updateForm({ activeDayTime })}
            />

            <PreferenceToggle
              label={t('summaries:preferences.weeklyNotifications')}
              description={t('summaries:weekly.notificationDescription')}
              value={form.weeklyEnabled}
              onChange={(weeklyEnabled) => updateForm({ weeklyEnabled })}
            />
            <TextInput
              disabled={!form.weeklyEnabled}
              label={t('summaries:preferences.timeLabel')}
              mode="outlined"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              placeholder="10:00"
              value={form.weeklyTime}
              onChangeText={(weeklyTime) => updateForm({ weeklyTime })}
            />

            <PreferenceToggle
              label={t('summaries:preferences.shareLocation')}
              description={t('summaries:preferences.locationDescription')}
              value={form.shareLocation}
              onChange={(shareLocation) => updateForm({ shareLocation })}
            />
          </>
        )}

        <HelperText type="error" visible={!!formError}>
          {formError}
        </HelperText>
        <HelperText type="info" visible={permissionWarning}>
          {t('summaries:preferences.permissionDenied')}
        </HelperText>

        <View style={styles.actions}>
          <Button disabled={saving} mode="text" onPress={onDismiss}>
            {t('common:actions.cancel')}
          </Button>
          <Button disabled={loading || saving} loading={saving} mode="contained" onPress={handleSave}>
            {t('common:actions.save')}
          </Button>
        </View>
      </Modal>
    </Portal>
  )
}

const styles = StyleSheet.create({
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  description: {
    color: '#5B6572',
    fontSize: 14,
    lineHeight: 20,
  },
  loader: {
    marginVertical: 28,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    gap: 12,
    marginHorizontal: 20,
    maxHeight: '90%',
    padding: 20,
  },
  title: {
    color: '#1F2933',
    fontSize: 18,
    fontWeight: '700',
  },
  toggleCopy: {
    flex: 1,
    marginRight: 12,
  },
  toggleDescription: {
    color: '#66717D',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  toggleLabel: {
    color: '#25303B',
    fontSize: 15,
    fontWeight: '700',
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})
