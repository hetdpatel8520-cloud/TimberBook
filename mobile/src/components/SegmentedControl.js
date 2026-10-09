import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

export default function SegmentedControl({
  options = [],
  selectedIndex = 0,
  onChange,
  containerStyle
}) {
  return (
    <View style={[styles.container, containerStyle]}>
      {options.map((option, index) => {
        const isSelected = selectedIndex === index;
        return (
          <TouchableOpacity
            key={index}
            activeOpacity={0.7}
            onPress={() => onChange && onChange(index)}
            style={[
              styles.segment,
              isSelected ? styles.segmentSelected : null
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected ? styles.segmentTextSelected : null
              ]}
              numberOfLines={1}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceBg,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: 8
  },
  segmentSelected: {
    backgroundColor: colors.navyPrimary,
    shadowColor: colors.navyDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary
  },
  segmentTextSelected: {
    color: colors.white,
    fontWeight: '700'
  }
});
