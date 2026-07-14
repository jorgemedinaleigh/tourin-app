import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { Modal, Portal, TextInput } from 'react-native-paper'
import {
  getSubdivisionLabel,
  getSubdivisionOptions,
  normalizeSubdivisionCode,
} from '../utils/countrySubdivisions'

const SubdivisionSelect = ({
  countryCode,
  label,
  locale,
  modalTitle,
  onSelect,
  placeholder,
  value,
}) => {
  const [visible, setVisible] = useState(false)
  const subdivisionOptions = useMemo(
    () => getSubdivisionOptions(countryCode, locale),
    [countryCode, locale]
  )
  const selectedCode = normalizeSubdivisionCode(value)
  const selectedLabel = selectedCode
    ? getSubdivisionLabel(countryCode, selectedCode, locale)
    : ''

  const handleSelect = (subdivisionCode) => {
    onSelect(subdivisionCode)
    setVisible(false)
  }

  if (!subdivisionOptions.length) return null

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={selectedLabel || placeholder || label}
        accessibilityState={{ expanded: visible }}
        style={({ pressed }) => pressed && styles.fieldPressed}
        onPress={() => setVisible(true)}
      >
        <TextInput
          accessible={false}
          editable={false}
          label={label}
          mode="outlined"
          pointerEvents="none"
          placeholder={placeholder}
          right={<TextInput.Icon icon="chevron-down" />}
          value={selectedLabel}
        />
      </Pressable>

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>{modalTitle}</Text>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {subdivisionOptions.map((subdivision) => {
              const isSelected = subdivision.code === selectedCode

              return (
                <Pressable
                  key={subdivision.code}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.option,
                    isSelected && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => handleSelect(subdivision.code)}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {subdivision.label}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </Modal>
      </Portal>
    </>
  )
}

export default SubdivisionSelect

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
    marginBottom: 12,
  },
  list: {
    maxHeight: 520,
  },
  option: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  optionSelected: {
    borderColor: '#1B7D4A',
    backgroundColor: '#F2FBF5',
  },
  optionPressed: {
    opacity: 0.75,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#25303B',
  },
  optionTextSelected: {
    color: '#1B7D4A',
  },
})
