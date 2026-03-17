export function authErrorToMessage(error) {
  const code = error?.code
  const type = error?.type
  const name = error?.name

  if (code === 401 || type === 'user_unauthorized' || type === 'user_invalid_credentials' || name === 'NotAuthorizedException') {
    return 'Correo o contraseña inválidos.'
  }
  if (code === 429 || type === 'general_rate_limit_exceeded' || name === 'TooManyRequestsException') {
    return 'Demasiadas solicitudes. Intenta nuevamente en un momento.'
  }
  if (code === 403 || type === 'user_blocked') {
    return 'Tu cuenta está bloqueada. Contacta al soporte.'
  }
  if (type === 'user_not_found' || name === 'UserNotFoundException') {
    return 'No encontramos una cuenta con esos datos.'
  }
  if (type === 'user_email_not_whitelisted') {
    return 'Este correo no está autorizado para iniciar sesión.'
  }
  if (type === 'user_email_already_exists' || name === 'UsernameExistsException') {
    return 'Este correo ya está registrado.'
  }
  if (name === 'UserNotConfirmedException') {
    return 'Tu cuenta aún no está confirmada. Revisa el código enviado a tu correo.'
  }
  if (name === 'CodeMismatchException') {
    return 'El código ingresado no es válido.'
  }
  if (name === 'ExpiredCodeException') {
    return 'El código ha expirado. Solicita uno nuevo.'
  }
  if (name === 'InvalidPasswordException') {
    return 'La contraseña no cumple los requisitos de seguridad.'
  }
  if (name === 'AuthTokenConfigException') {
    return 'La configuración de autenticación no está completa en la app.'
  }

  return error?.message || 'Ocurrió un error. Intenta nuevamente.'
}
