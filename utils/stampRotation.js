export const getStampRotation = (id = '') => {
  const value = String(id)
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }

  return `${(Math.abs(hash) % 31) - 15}deg`
}
