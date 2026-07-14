export const EXPLORATION_MODES = [
  'solo',
  'couple',
  'family',
  'friends',
  'work_or_study',
]

const EXPLORATION_MODE_SET = new Set(EXPLORATION_MODES)

export const normalizeExplorationModes = (values) => {
  if (!Array.isArray(values)) return []

  const selectedModes = new Set(
    values
      .map((value) => String(value || '').trim().toLowerCase())
      .filter((value) => EXPLORATION_MODE_SET.has(value))
  )

  return EXPLORATION_MODES.filter((mode) => selectedModes.has(mode))
}

export const hasValidExplorationModes = (values) =>
  normalizeExplorationModes(values).length > 0

export const areExplorationModesEqual = (left, right) => {
  const normalizedLeft = normalizeExplorationModes(left)
  const normalizedRight = normalizeExplorationModes(right)

  return normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((mode, index) => mode === normalizedRight[index])
}
