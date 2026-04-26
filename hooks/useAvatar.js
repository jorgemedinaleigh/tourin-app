export function useAvatar(user) {
  if (!user) return undefined

  return user?.prefs?.avatarUrl
}
