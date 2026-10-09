import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function CustomInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType = 'default',
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  suffix,
  prefix,
  editable = true,
  autoCapitalize = 'none',
  containerStyle
}) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          error ? styles.inputError : null,
          !editable ? styles.disabledInput : null
        ]}
      >
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={[
            styles.input,
            multiline ? styles.multilineInput : null,
            !editable ? styles.disabledText : null
          ]}
          value={value !== undefined && value !== null ? String(value) : ''}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          autoCapitalize={autoCapitalize}
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 44
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 10
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top'
  },
  prefix: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 6
  },
  suffix: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.goldDark,
    marginLeft: 6
  },
  inputError: {
    borderColor: colors.errorText,
    backgroundColor: colors.errorBg
  },
  errorText: {
    fontSize: 11,
    color: colors.errorText,
    marginTop: 4,
    fontWeight: '500'
  },
  disabledInput: {
    backgroundColor: colors.surfaceBg,
    borderColor: colors.border
  },
  disabledText: {
    color: colors.textSecondary
  }
});
