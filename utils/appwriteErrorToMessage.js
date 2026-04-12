import i18n from '../i18n'

export function appwriteErrorToMessage(error) {
    const code = error?.code;
    const type = error?.type;

    if (code === 401 || type === 'user_unauthorized' || type === 'user_invalid_credentials') {
      return i18n.t('errors:appwrite.invalidCredentials')
    }
    if (code === 429 || type === 'general_rate_limit_exceeded') {
      return i18n.t('errors:appwrite.tooManyRequests')
    }
    if (code === 403 || type === 'user_blocked') {
      return i18n.t('errors:appwrite.blockedAccount')
    }
    if (type === 'user_not_found') {
      return i18n.t('errors:appwrite.userNotFound')
    }
    if (type === 'user_email_not_whitelisted') {
      return i18n.t('errors:appwrite.emailNotAllowed')
    }
    if (type === 'user_email_already_exists') {
      return i18n.t('errors:appwrite.emailAlreadyExists')
    }

    
    return error?.message || i18n.t('errors:appwrite.generic');
}
