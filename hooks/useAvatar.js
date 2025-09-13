import { storage, avatars } from '../lib/appwrite'

const BUCKET_ID = '68c5e59b0038548412d1'

export function useAvatar(user) {
    if (!user) return undefined

    if (user.prefs.avatarFileId) {
      const url = storage.getFileView({
        bucketId: BUCKET_ID,
        fileId: user.prefs.avatarFileId,
      })
      return url.toString()
    }

    return avatars.getInitials({
        name: user.name,
        width: 200,
        height: 200,
      }).toString()
}
