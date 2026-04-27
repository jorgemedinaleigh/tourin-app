import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Button, HelperText, Modal, Portal, TextInput, useTheme } from 'react-native-paper'
import { useUser } from '../../hooks/useUser'
import { useStats } from '../../hooks/useStats'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import ThemedView from '../../components/ThemedView'
import CountrySelect from '../../components/CountrySelect'
import { useI18n } from '../../contexts/I18nContext'
import { formatMonthYear } from '../../i18n/formatters'
import { COUNTRY_CODE_PATTERN, formatDateOfBirthInput, getCountryFlagEmoji, normalizeCountryCode, normalizeDateOfBirth } from '../../utils/profileDetails'

const profileScreen = () => {
  const { user, logout, updateProfileDetails } = useUser()
  const { stats, getStats } = useStats(user.$id)
  const theme = useTheme()
  const { t } = useTranslation(['common', 'profile'])
  const { locale, setLocale, availableLocales } = useI18n()
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false)
  const [languageModalVisible, setLanguageModalVisible] = useState(false)
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)
  const [detailsCountryCode, setDetailsCountryCode] = useState('')
  const [detailsDateOfBirth, setDetailsDateOfBirth] = useState('')
  const [detailsError, setDetailsError] = useState(null)
  const [detailsSaving, setDetailsSaving] = useState(false)

  const displayName = user?.name || t('common:fallbacks.genericUser')
  const handle = user?.email ? user.email.split('@')[0] : t('common:fallbacks.handle')
  const createdAtDate = user?.$createdAt ? new Date(user.$createdAt) : null
  const joinDate = createdAtDate
    ? formatMonthYear(createdAtDate, locale)
    : t('profile:memberSinceFallback')
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
  const handleLabel = t('profile:handle', { date: joinDate, handle })
  const countryFlag = getCountryFlagEmoji(user?.countryCode || user?.profile?.country_code)

  const handleLogout = async () => {
    await logout()
  }

  const handleLanguageChange = async (nextLocale) => {
    await setLocale(nextLocale)
    setLanguageModalVisible(false)
  }

  const openPreferencesModal = () => {
    setPreferencesModalVisible(true)
  }

  const openLanguageModal = () => {
    setPreferencesModalVisible(false)
    setLanguageModalVisible(true)
  }

  const openDetailsModal = () => {
    setPreferencesModalVisible(false)
    setDetailsCountryCode(user?.countryCode || user?.profile?.country_code || '')
    setDetailsDateOfBirth(user?.dateOfBirth || user?.privateDetails?.date_of_birth || '')
    setDetailsError(null)
    setDetailsModalVisible(true)
  }

  const handleDetailsSave = async () => {
    setDetailsError(null)

    const countryCode = normalizeCountryCode(detailsCountryCode)
    const dateOfBirth = normalizeDateOfBirth(detailsDateOfBirth)

    if (!countryCode || !detailsDateOfBirth.trim()) {
      setDetailsError(t('profile:details.missingFields'))
      return
    }

    if (!dateOfBirth) {
      setDetailsError(t('profile:details.invalidDateOfBirth'))
      return
    }

    if (!COUNTRY_CODE_PATTERN.test(countryCode)) {
      setDetailsError(t('profile:details.invalidCountry'))
      return
    }

    try {
      setDetailsSaving(true)
      await updateProfileDetails({
        countryCode,
        dateOfBirth,
      })
      setDetailsModalVisible(false)
    } catch (error) {
      setDetailsError(t('profile:details.saveError'))
    } finally {
      setDetailsSaving(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      if(user?.$id) {
        getStats()
      }
    }, [user?.$id])
  )

  return (
    <ThemedView style={styles.container} safe>
      <View style={styles.profileCard}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.nameRow}>
          {countryFlag ? <Text style={styles.flagEmoji}>{countryFlag}</Text> : null}
          <Text style={styles.nameText}>{displayName}</Text>
        </View>
        <Text style={styles.handleText}>{handleLabel}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.addFriendButton, styles.raised]} disabled activeOpacity={1}>
            <Ionicons name="person-add" size={16} color={theme.colors.primary} style={styles.addFriendIcon} />
            <Text style={styles.addFriendText}>{t('profile:addFriends')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareIconButton, styles.raised]} disabled activeOpacity={1}>
            <Ionicons name="share-social" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('profile:summaryTitle')}</Text>

      <TouchableOpacity
        style={[styles.summaryCard, styles.raised]}
        onPress={() => router.push('dashboard/passportScreen')}
        activeOpacity={0.8}
      >
        <View style={styles.summaryIcon}>
          <Ionicons name="location" size={18} color="#6f6f6f" />
        </View>
        <Text style={styles.summaryText}>{t('common:counts.sites', { count: stats?.sitesVisited ?? 0 })}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.summaryCard, styles.raised]} disabled activeOpacity={1}>
        <View style={styles.summaryIcon}>
          <Ionicons name="calendar" size={18} color="#6f6f6f" />
        </View>
        <Text style={styles.summaryText}>{t('common:counts.events', { count: stats?.eventsAttended ?? 0 })}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.summaryCard, styles.raised]}
        onPress={() => router.push('dashboard/achievementsScreen')}
        activeOpacity={0.8}
      >
        <View style={styles.summaryIcon}>
          <Ionicons name="trophy" size={18} color="#6f6f6f" />
        </View>
        <Text style={styles.summaryText}>{t('common:counts.achievements', { count: stats?.achievementsUnlocked ?? 0 })}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.preferencesButton, styles.raised]}
        onPress={openPreferencesModal}
        activeOpacity={0.8}
      >
        <Ionicons name="settings" size={18} color={theme.colors.primary} style={styles.preferencesButtonIcon} />
        <Text style={styles.preferencesButtonText}>{t('profile:preferences.action')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.logoutButton, styles.raised]}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={18} color="#ffffff" style={styles.logoutIcon} />
        <Text style={styles.logoutText}>{t('profile:logout')}</Text>
      </TouchableOpacity>

      <Portal>
        <Modal
          visible={preferencesModalVisible}
          onDismiss={() => setPreferencesModalVisible(false)}
          contentContainerStyle={styles.preferencesModal}
        >
          <Text style={styles.languageModalTitle}>{t('profile:preferences.title')}</Text>
          <TouchableOpacity
            style={styles.preferenceOption}
            onPress={openDetailsModal}
            activeOpacity={0.8}
          >
            <View style={styles.preferenceOptionTextBlock}>
              <Text style={styles.preferenceOptionTitle}>{t('profile:preferences.user')}</Text>
            </View>
            <Ionicons name="person-circle" size={20} color="#5B6572" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.preferenceOption}
            onPress={openLanguageModal}
            activeOpacity={0.8}
          >
            <View style={styles.preferenceOptionTextBlock}>
              <Text style={styles.preferenceOptionTitle}>{t('profile:preferences.language')}</Text>
            </View>
            <Ionicons name="language" size={20} color="#5B6572" />
          </TouchableOpacity>
        </Modal>
        <Modal
          visible={languageModalVisible}
          onDismiss={() => setLanguageModalVisible(false)}
          contentContainerStyle={styles.languageModal}
        >
          <Text style={styles.languageModalTitle}>{t('profile:language.title')}</Text>
          <Text style={styles.languageModalCopy}>{t('profile:language.description')}</Text>
          {availableLocales.map((localeCode) => {
            const isActive = locale === localeCode

            return (
              <TouchableOpacity
                key={localeCode}
                style={[
                  styles.languageOption,
                  isActive && styles.languageOptionActive,
                ]}
                onPress={() => handleLanguageChange(localeCode)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.languageOptionText,
                    isActive && styles.languageOptionTextActive,
                  ]}
                >
                  {t(`common:languageNames.${localeCode}`)}
                </Text>
                {isActive ? (
                  <Ionicons name="checkmark-circle" size={18} color="#1B7D4A" />
                ) : null}
              </TouchableOpacity>
            )
          })}
        </Modal>
        <Modal
          visible={detailsModalVisible}
          onDismiss={() => setDetailsModalVisible(false)}
          contentContainerStyle={styles.detailsModal}
        >
          <Text style={styles.languageModalTitle}>{t('profile:details.title')}</Text>
          <Text style={styles.languageModalCopy}>{t('profile:details.description')}</Text>
          <TextInput
            label={t('profile:details.dateOfBirthLabel')}
            mode="outlined"
            keyboardType="numeric"
            maxLength={10}
            placeholder={t('profile:details.dateOfBirthPlaceholder')}
            value={detailsDateOfBirth}
            onChangeText={(value) => setDetailsDateOfBirth(formatDateOfBirthInput(value))}
          />
          <CountrySelect
            label={t('profile:details.countryCodeLabel')}
            locale={locale}
            modalTitle={t('profile:details.countrySelectTitle')}
            onSelect={setDetailsCountryCode}
            placeholder={t('profile:details.countryPlaceholder')}
            value={detailsCountryCode}
          />
          <HelperText type="error" visible={!!detailsError}>
            {detailsError}
          </HelperText>
          <View style={styles.detailsModalActions}>
            <Button
              mode="text"
              onPress={() => setDetailsModalVisible(false)}
              disabled={detailsSaving}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleDetailsSave}
              loading={detailsSaving}
              disabled={detailsSaving}
            >
              {t('common:actions.save')}
            </Button>
          </View>
        </Modal>
      </Portal>
    </ThemedView>
  )
}

export default profileScreen

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#EFEFEF',
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#E6E6E6',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: '#E0E0E0',
    backgroundColor: '#36B38D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: '#F4C8C1',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '700',
    color: '#7A4B46',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  flagEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  nameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#303030',
  },
  handleText: {
    fontSize: 13,
    color: '#6A6A6A',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D6D6D6',
    flex: 1,
    justifyContent: 'center',
  },
  addFriendIcon: {
    marginRight: 6,
  },
  addFriendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A9CD6',
    letterSpacing: 0.3,
  },
  shareIconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6D6D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  preferencesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D6D6D6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  preferencesButtonIcon: {
    marginRight: 8,
  },
  preferencesButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A9CD6',
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    color: '#2D2D2D',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D94A4A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C63F3F',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  languageModal: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  preferencesModal: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  detailsModal: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 20,
    gap: 10,
  },
  detailsModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  languageModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2933',
  },
  languageModalCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5B6572',
  },
  preferenceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  preferenceOptionTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  preferenceOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#25303B',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  languageOptionActive: {
    borderColor: '#1B7D4A',
    backgroundColor: '#F2FBF5',
  },
  languageOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#25303B',
  },
  languageOptionTextActive: {
    color: '#1B7D4A',
  },
})
