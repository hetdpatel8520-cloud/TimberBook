import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  onPress,
  isHighlight = false
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.card,
        isHighlight && styles.cardHighlight
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.title, isHighlight && styles.titleHighlight]}>
          {title}
        </Text>
        {icon && (
          <View style={[styles.iconBox, isHighlight && styles.iconBoxHighlight]}>
            <Ionicons
              name={icon}
              size={18}
              color={isHighlight ? colors.goldPrimary : colors.navyPrimary}
            />
          </View>
        )}
      </View>

      <Text style={[styles.value, isHighlight && styles.valueHighlight]}>
        {value}
      </Text>

      {subtitle && (
        <Text style={[styles.subtitle, isHighlight && styles.subtitleHighlight]}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 88,
    justifyContent: 'space-between',
    shadowColor: colors.navyDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  cardHighlight: {
    backgroundColor: colors.navyPrimary,
    borderColor: colors.goldDark
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  titleHighlight: {
    color: colors.textMuted
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconBoxHighlight: {
    backgroundColor: colors.navyDark
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 6
  },
  valueHighlight: {
    color: colors.goldPrimary
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  subtitleHighlight: {
    color: colors.goldLight
  }
});
