export function appwriteErrorToMessage(error) {
    const code = error?.code;
    const type = error?.type;

    if (code === 401 || type === 'user_unauthorized' || type === 'user_invalid_credentials') {
      return 'Correo o contraseña inválidos.'
    }
    if (code === 429 || type === 'general_rate_limit_exceeded') {
      return 'Demasiadas solicitudes. Intenta nuevamente en un momento.'
    }
    if (code === 403 || type === 'user_blocked') {
      return 'Tu cuenta está bloqueada. Contacta al soporte.'
    }
    if (type === 'user_not_found') {
      return 'No encontramos una cuenta con esos datos.'
    }
    if (type === 'user_email_not_whitelisted') {
      return 'Este correo no está autorizado para iniciar sesión.'
    }
    if (type === 'user_email_already_exists') {
      return 'Este correo ya está registrado.'
    }

    
    return error?.message || 'Ocurrió un error. Intenta nuevamente.';
}