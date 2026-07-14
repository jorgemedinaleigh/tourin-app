import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button, Modal, Portal, TextInput } from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { EXPLORATION_MODES, normalizeExplorationModes } from '../utils/explorationModes'

const ExplorationModeSelect = ({ disabled = false, multiple = true, onChange, value = [] }) => {
  const { t } = useTranslation(['explorationModes', 'common'])
  const [visible, setVisible] = useState(false)
  const [draftSelection, setDraftSelection] = useState([])
  const selectedModes = useMemo(() => {
    const normalizedModes = normalizeExplorationModes(value)
    return multiple ? normalizedModes : normalizedModes.slice(0, 1)
  }, [multiple, value])
  const selectedLabels = selectedModes.map((mode) => t(`options.${mode}`))
  const placeholder = multiple ? t('placeholder') : t('singlePlaceholder')

  const openModal = () => {
    setDraftSelection(selectedModes)
    setVisible(true)
  }

  const closeModal = () => {
    setVisible(false)
  }

  const toggleMode = (mode) => {
    if (!multiple) {
      setDraftSelection([mode])
      return
    }

    setDraftSelection((current) => {
      const nextSelection = current.includes(mode)
        ? current.filter((selectedMode) => selectedMode !== mode)
        : [...current, mode]

      return normalizeExplorationModes(nextSelection)
    })
  }

  const confirmSelection = () => {
    const normalizedSelection = normalizeExplorationModes(draftSelection)
    const nextSelection = multiple ? normalizedSelection : normalizedSelection.slice(0, 1)
    if (!nextSelection.length) return

    onChange(nextSelection)
    setVisible(false)
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={selectedLabels.join(', ') || placeholder || t('question')}
        accessibilityState={{ disabled, expanded: visible }}
        disabled={disabled}
        style={({ pressed }) => pressed && styles.fieldPressed}
        onPress={openModal}
      >
        <TextInput
          accessible={false}
          disabled={disabled}
          editable={false}
          label={t('question')}
          mode="outlined"
          pointerEvents="none"
          placeholder={placeholder}
          right={<TextInput.Icon icon="chevron-down" />}
          value={selectedLabels.join(', ')}
        />
      </Pressable>

      <Portal>
        <Modal
          visible={visible}
          onDismiss={closeModal}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>{t('question')}</Text>
          <Text style={styles.modalDescription}>
            {multiple ? t('multipleHint') : t('singleHint')}
          </Text>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {EXPLORATION_MODES.map((mode) => {
              const isSelected = draftSelection.includes(mode)

              return (
                <Pressable
                  key={mode}
                  accessibilityRole={multiple ? 'checkbox' : 'radio'}
                  accessibilityState={{ checked: isSelected }}
                  style={({ pressed }) => [
                    styles.option,
                    isSelected && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => toggleMode(mode)}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {t(`options.${mode}`)}
                  </Text>
                  <Ionicons
                    name={
                      multiple
                        ? isSelected ? 'checkbox' : 'square-outline'
                        : isSelected ? 'radio-button-on' : 'radio-button-off'
                    }
                    size={22}
                    color={isSelected ? '#1B7D4A' : '#74777F'}
                  />
                </Pressable>
              )
            })}
          </ScrollView>
          <View style={styles.actions}>
            <Button mode="text" onPress={closeModal}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              mode="contained"
              disabled={!draftSelection.length}
              onPress={confirmSelection}
            >
              {t('confirm')}
            </Button>
          </View>
        </Modal>
      </Portal>
    </>
  )
}

export default ExplorationModeSelect

const styles = StyleSheet.create({
  fieldPressed: {
    opacity: 0.8,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 20,
    maxHeight: '82%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2933',
  },
  modalDescription: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#5B6572',
  },
  list: {
    maxHeight: 420,
  },
  option: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionSelected: {
    borderColor: '#1B7D4A',
    backgroundColor: '#F2FBF5',
  },
  optionPressed: {
    opacity: 0.75,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#25303B',
  },
  optionTextSelected: {
    color: '#1B7D4A',
  },
  actions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
})
