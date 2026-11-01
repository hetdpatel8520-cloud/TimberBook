import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { useResponsive } from '../utils/responsive';

export default function SegmentedControl({
  options = [],
  selectedIndex = 0,
  onChange,
  containerStyle,
  columns
}) {
  const { width, isSmall } = useResponsive();

  // Auto-detect whether to display in a multi-column wrapping grid
  const useGrid =
    columns !== undefined
      ? columns > 1
      : (options.length >= 4 && width < 520) || (options.length === 3 && isSmall);

  return (
    <View
      style={[
        styles.container,
        useGrid && styles.gridContainer,
        containerStyle
      ]}
    >
      {options.map((option, index) => {
        const isSelected = selectedIndex === index;
        return (
          <TouchableOpacity
            key={index}
            activeOpacity={0.7}
            onPress={() => onChange && onChange(index)}
            style={[
              styles.segment,
              useGrid && styles.gridSegment,
              isSelected ? styles.segmentSelected : null
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected ? styles.segmentTextSelected : null
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              maxFontSizeMultiplier={1.2}
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
  gridContainer: {
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 4
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: 8
  },
  gridSegment: {
    flex: 0,
    width: '49%',
    marginVertical: 2,
    minHeight: 36
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
    color: colors.textSecondary,
    textAlign: 'center'
  },
  segmentTextSelected: {
    color: colors.white,
    fontWeight: '700'
  }
});
