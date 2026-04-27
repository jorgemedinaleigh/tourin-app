import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Modal, Portal } from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { getCountryLabel, getCountryOptions, normalizeCountryCode } from '../utils/profileDetails'

const CountrySelect = ({
  label,
  locale,
  modalTitle,
  onSelect,
  placeholder,
  value,
}) => {
  const [visible, setVisible] = useState(false)
  const countryOptions = useMemo(() => getCountryOptions(locale), [locale])
  const selectedCode = normalizeCountryCode(value)
  const selectedLabel = selectedCode ? getCountryLabel(selectedCode, locale) : ''

  const handleSelect = (countryCode) => {
    onSelect(countryCode)
    setVisible(false)
  }

  return (
    <>
      <TouchableOpacity
        style={styles.field}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.fieldTextBlock}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.value, !selectedLabel && styles.placeholder]}>
            {selectedLabel || placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color="#555555" />
      </TouchableOpacity>

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>{modalTitle}</Text>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {countryOptions.map((country) => {
              const isSelected = country.code === selectedCode

              return (
                <TouchableOpacity
                  key={country.code}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => handleSelect(country.code)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {country.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </Modal>
      </Portal>
    </>
  )
}

export default CountrySelect

const styles = StyleSheet.create({
  field: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#777777',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  fieldTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 12,
    color: '#555555',
    marginBottom: 3,
  },
  value: {
    fontSize: 16,
    color: '#1F2933',
  },
  placeholder: {
    color: '#74777F',
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
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#25303B',
  },
  optionTextSelected: {
    color: '#1B7D4A',
  },
})
