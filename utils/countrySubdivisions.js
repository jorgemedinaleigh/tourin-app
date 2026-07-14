import { normalizeCountryCode } from './profileDetails'

export const SUBDIVISION_CODE_PATTERN = /^[A-Z]{2}-[A-Z0-9]{1,3}$/

const CHILE_REGIONS = [
  {
    code: 'CL-AI',
    names: {
      en: 'Aysén del General Carlos Ibáñez del Campo',
      es: 'Aysén del General Carlos Ibáñez del Campo',
      pt: 'Aysén del General Carlos Ibáñez del Campo',
    },
  },
  {
    code: 'CL-AN',
    names: { en: 'Antofagasta', es: 'Antofagasta', pt: 'Antofagasta' },
  },
  {
    code: 'CL-AP',
    names: { en: 'Arica and Parinacota', es: 'Arica y Parinacota', pt: 'Arica e Parinacota' },
  },
  {
    code: 'CL-AR',
    names: { en: 'Araucanía', es: 'La Araucanía', pt: 'Araucanía' },
  },
  {
    code: 'CL-AT',
    names: { en: 'Atacama', es: 'Atacama', pt: 'Atacama' },
  },
  {
    code: 'CL-BI',
    names: { en: 'Biobío', es: 'Biobío', pt: 'Biobío' },
  },
  {
    code: 'CL-CO',
    names: { en: 'Coquimbo', es: 'Coquimbo', pt: 'Coquimbo' },
  },
  {
    code: 'CL-LI',
    names: {
      en: "Libertador General Bernardo O'Higgins",
      es: "Libertador General Bernardo O'Higgins",
      pt: "Libertador General Bernardo O'Higgins",
    },
  },
  {
    code: 'CL-LL',
    names: { en: 'Los Lagos', es: 'Los Lagos', pt: 'Los Lagos' },
  },
  {
    code: 'CL-LR',
    names: { en: 'Los Ríos', es: 'Los Ríos', pt: 'Los Ríos' },
  },
  {
    code: 'CL-MA',
    names: {
      en: 'Magallanes and Chilean Antarctica',
      es: 'Magallanes y de la Antártica Chilena',
      pt: 'Magalhães e Antártica Chilena',
    },
  },
  {
    code: 'CL-ML',
    names: { en: 'Maule', es: 'Maule', pt: 'Maule' },
  },
  {
    code: 'CL-NB',
    names: { en: 'Ñuble', es: 'Ñuble', pt: 'Ñuble' },
  },
  {
    code: 'CL-RM',
    names: {
      en: 'Santiago Metropolitan',
      es: 'Metropolitana de Santiago',
      pt: 'Metropolitana de Santiago',
    },
  },
  {
    code: 'CL-TA',
    names: { en: 'Tarapacá', es: 'Tarapacá', pt: 'Tarapacá' },
  },
  {
    code: 'CL-VS',
    names: { en: 'Valparaíso', es: 'Valparaíso', pt: 'Valparaíso' },
  },
]

const SUBDIVISION_CONFIG_BY_COUNTRY = {
  CL: {
    required: true,
    type: 'region',
    subdivisions: CHILE_REGIONS,
  },
}

const getSupportedLocale = (locale) => {
  const language = String(locale || '').toLowerCase().split('-')[0]
  return ['en', 'es', 'pt'].includes(language) ? language : 'es'
}

export const normalizeSubdivisionCode = (value) => String(value || '').trim().toUpperCase()

export const getSubdivisionConfig = (countryCode) =>
  SUBDIVISION_CONFIG_BY_COUNTRY[normalizeCountryCode(countryCode)] || null

export const isSubdivisionRequired = (countryCode) =>
  Boolean(getSubdivisionConfig(countryCode)?.required)

export const getSubdivisionType = (countryCode) =>
  getSubdivisionConfig(countryCode)?.type || null

export const getSubdivisionOptions = (countryCode, locale = 'es') => {
  const config = getSubdivisionConfig(countryCode)
  if (!config) return []

  const language = getSupportedLocale(locale)
  const options = config.subdivisions.map((subdivision) => ({
    code: subdivision.code,
    label: subdivision.names[language] || subdivision.names.es || subdivision.names.en,
  }))

  try {
    const collator = new Intl.Collator(language)
    return options.sort((left, right) => collator.compare(left.label, right.label))
  } catch {
    return options.sort((left, right) => left.label.localeCompare(right.label))
  }
}

export const getSubdivisionLabel = (countryCode, subdivisionCode, locale = 'es') => {
  const normalizedCode = normalizeSubdivisionCode(subdivisionCode)
  return getSubdivisionOptions(countryCode, locale)
    .find((subdivision) => subdivision.code === normalizedCode)?.label || ''
}

export const isValidSubdivisionForCountry = (countryCode, subdivisionCode) => {
  const normalizedCode = normalizeSubdivisionCode(subdivisionCode)
  if (!SUBDIVISION_CODE_PATTERN.test(normalizedCode)) return false

  const config = getSubdivisionConfig(countryCode)
  if (!config) return false

  return config.subdivisions.some((subdivision) => subdivision.code === normalizedCode)
}
