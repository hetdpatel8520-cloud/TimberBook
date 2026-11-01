import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function ActionTile({
  title,
  subtitle,
  icon,
  onPress,
  badgeCount,
  badge,
  accent = false,
  isPrimary = false,
  style
}) {
  const isAccent = accent || isPrimary;
  const badgeLabel = badge !== undefined ? badge : badgeCount;
  const showBadge = badgeLabel !== undefined && badgeLabel !== null && badgeLabel !== '';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.tile,
        isAccent && styles.tileAccent,
        style
      ]}
    >
      <View style={[styles.iconContainer, isAccent && styles.iconContainerAccent]}>
        <Ionicons
          name={icon}
          size={24}
          color={isAccent ? colors.navyDark : colors.goldPrimary}
        />
        {showBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {badgeLabel}
            </Text>
          </View>
        )}
      </View>

      <Text
        style={[styles.title, isAccent && styles.titleAccent]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.2}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={[styles.subtitle, isAccent && styles.subtitleAccent]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={1.2}
        >
          {subtitle}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 90,
    minWidth: 70,
    shadowColor: colors.navyDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2
  },
  tileAccent: {
    backgroundColor: colors.navyPrimary,
    borderColor: colors.goldDark
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative'
  },
  iconContainerAccent: {
    backgroundColor: colors.goldPrimary
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.goldDark,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center'
  },
  badgeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '700'
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center'
  },
  titleAccent: {
    color: colors.white
  },
  subtitle: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2
  },
  subtitleAccent: {
    color: colors.goldLight
  }
});
