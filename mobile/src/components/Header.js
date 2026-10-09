import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function Header({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightIcon,
  onRightPress,
  badgeText
}) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navyDark} />
      <View style={styles.contentRow}>
        <View style={styles.leftCol}>
          {showBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.iconButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.logoBadge}>
              <Ionicons name="cube-outline" size={22} color={colors.goldPrimary} />
            </View>
          )}

          <View style={styles.titleCol}>
            <View style={styles.titleRow}>
              <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
              {badgeText && (
                <View style={styles.fyBadge}>
                  <Text style={styles.fyBadgeText}>{badgeText}</Text>
                </View>
              )}
            </View>
            {subtitle && (
              <Text style={styles.subtitleText} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightPress}
            style={styles.iconButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name={rightIcon} size={22} color={colors.goldPrimary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.navyPrimary,
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.navyDark
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.goldDark
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4
  },
  titleCol: {
    flex: 1
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white
  },
  fyBadge: {
    marginLeft: 8,
    backgroundColor: colors.goldPrimary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  fyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.navyDark
  },
  subtitleText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2
  }
});
