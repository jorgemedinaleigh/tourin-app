import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import achievementsEn from './locales/en/achievements.json'
import authEn from './locales/en/auth.json'
import commonEn from './locales/en/common.json'
import errorsEn from './locales/en/errors.json'
import homeEn from './locales/en/home.json'
import infoCardEn from './locales/en/infoCard.json'
import mapEn from './locales/en/map.json'
import passportEn from './locales/en/passport.json'
import profileEn from './locales/en/profile.json'
import routesEn from './locales/en/routes.json'
import stampOverlayEn from './locales/en/stampOverlay.json'
import achievementsEs from './locales/es/achievements.json'
import authEs from './locales/es/auth.json'
import commonEs from './locales/es/common.json'
import errorsEs from './locales/es/errors.json'
import homeEs from './locales/es/home.json'
import infoCardEs from './locales/es/infoCard.json'
import mapEs from './locales/es/map.json'
import passportEs from './locales/es/passport.json'
import profileEs from './locales/es/profile.json'
import routesEs from './locales/es/routes.json'
import stampOverlayEs from './locales/es/stampOverlay.json'
import achievementsPt from './locales/pt/achievements.json'
import authPt from './locales/pt/auth.json'
import commonPt from './locales/pt/common.json'
import errorsPt from './locales/pt/errors.json'
import homePt from './locales/pt/home.json'
import infoCardPt from './locales/pt/infoCard.json'
import mapPt from './locales/pt/map.json'
import passportPt from './locales/pt/passport.json'
import profilePt from './locales/pt/profile.json'
import routesPt from './locales/pt/routes.json'
import stampOverlayPt from './locales/pt/stampOverlay.json'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './formatters'

const resources = {
  en: {
    achievements: achievementsEn,
    auth: authEn,
    common: commonEn,
    errors: errorsEn,
    home: homeEn,
    infoCard: infoCardEn,
    map: mapEn,
    passport: passportEn,
    profile: profileEn,
    routes: routesEn,
    stampOverlay: stampOverlayEn,
  },
  es: {
    achievements: achievementsEs,
    auth: authEs,
    common: commonEs,
    errors: errorsEs,
    home: homeEs,
    infoCard: infoCardEs,
    map: mapEs,
    passport: passportEs,
    profile: profileEs,
    routes: routesEs,
    stampOverlay: stampOverlayEs,
  },
  pt: {
    achievements: achievementsPt,
    auth: authPt,
    common: commonPt,
    errors: errorsPt,
    home: homePt,
    infoCard: infoCardPt,
    map: mapPt,
    passport: passportPt,
    profile: profilePt,
    routes: routesPt,
    stampOverlay: stampOverlayPt,
  },
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    defaultNS: 'common',
    fallbackLng: DEFAULT_LOCALE,
    interpolation: {
      escapeValue: false,
    },
    lng: DEFAULT_LOCALE,
    react: {
      useSuspense: false,
    },
    resources,
    returnNull: false,
    supportedLngs: SUPPORTED_LOCALES,
  })
}

export default i18n
