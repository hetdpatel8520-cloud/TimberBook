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
  accent = false
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.tile,
        accent && styles.tileAccent
      ]}
    >
      <View style={[styles.iconContainer, accent && styles.iconContainerAccent]}>
        <Ionicons
          name={icon}
          size={24}
          color={accent ? colors.navyDark : colors.goldPrimary}
        />
        {badgeCount !== undefined && badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.title, accent && styles.titleAccent]} numberOfLines={1}>
        {title}
      </Text>

      {subtitle && (
        <Text style={[styles.subtitle, accent && styles.subtitleAccent]} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
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
    minWidth: 84,
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
