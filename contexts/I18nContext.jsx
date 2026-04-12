import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getLocales } from 'expo-localization'
import i18n from '../i18n'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, normalizeLocale } from '../i18n/formatters'
import { useUser } from '../hooks/useUser'

const I18nContext = createContext({
  availableLocales: SUPPORTED_LOCALES,
  locale: DEFAULT_LOCALE,
  setLocale: async () => {},
})

const getDeviceLocale = () => {
  const deviceLocale = getLocales()?.[0]
  return normalizeLocale(deviceLocale?.languageCode || deviceLocale?.languageTag)
}

export function I18nProvider({ children }) {
  const { user, updatePrefs } = useUser()
  const preferredLocale = normalizeLocale(user?.prefs?.locale || getDeviceLocale())
  const [locale, setLocaleState] = useState(preferredLocale)

  useEffect(() => {
    setLocaleState(preferredLocale)
    void i18n.changeLanguage(preferredLocale)
  }, [preferredLocale])

  const setLocale = async (nextLocale) => {
    const resolvedLocale = normalizeLocale(nextLocale)
    setLocaleState(resolvedLocale)
    await i18n.changeLanguage(resolvedLocale)

    if (user && user?.prefs?.locale !== resolvedLocale) {
      try {
        await updatePrefs({ locale: resolvedLocale })
      } catch (error) {
        console.warn('[I18nProvider] Failed to persist locale preference', error)
      }
    }
  }

  const value = useMemo(
    () => ({
      availableLocales: SUPPORTED_LOCALES,
      locale,
      setLocale,
    }),
    [locale]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)

export default I18nContext
