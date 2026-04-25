import i18n from '../i18n'

export function authErrorToMessage(error) {
  const code = error?.code
  const status = error?.status || error?.statusCode
  const type = error?.type
  const message = String(error?.message || '')
  const normalizedMessage = message.toLowerCase()

  if (
    status === 401 ||
    code === 401 ||
    type === 'user_unauthorized' ||
    type === 'user_invalid_credentials' ||
    normalizedMessage.includes('invalid login credentials')
  ) {
    return i18n.t('errors:appwrite.invalidCredentials')
  }

  if (status === 429 || code === 429 || type === 'general_rate_limit_exceeded') {
    return i18n.t('errors:appwrite.tooManyRequests')
  }

  if (
    status === 403 ||
    code === 403 ||
    type === 'user_blocked' ||
    normalizedMessage.includes('not allowed')
  ) {
    return i18n.t('errors:appwrite.blockedAccount')
  }

  if (type === 'user_not_found') {
    return i18n.t('errors:appwrite.userNotFound')
  }

  if (type === 'user_email_not_whitelisted') {
    return i18n.t('errors:appwrite.emailNotAllowed')
  }

  if (
    type === 'user_email_already_exists' ||
    normalizedMessage.includes('already registered') ||
    normalizedMessage.includes('already exists')
  ) {
    return i18n.t('errors:appwrite.emailAlreadyExists')
  }

  return message || i18n.t('errors:appwrite.generic')
}
