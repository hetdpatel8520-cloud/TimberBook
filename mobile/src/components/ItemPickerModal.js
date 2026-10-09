import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatINR } from '../utils/timberMath';

export default function ItemPickerModal({
  visible,
  onClose,
  onSelect,
  items = [],
  title = 'Select Timber Item',
  onAddNew
}) {
  const [search, setSearch] = useState('');

  const filtered = items.filter((i) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return Boolean(
      (i.name && i.name.toLowerCase().includes(term)) ||
      (i.hsn && i.hsn.toLowerCase().includes(term)) ||
      (i.group && i.group.toLowerCase().includes(term))
    );
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          {onAddNew ? (
            <TouchableOpacity onPress={onAddNew} style={styles.addBtn}>
              <Ionicons name="add" size={24} color={colors.goldPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search item by wood species, HSN, group..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item._id || item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isLowStock = (item.currentStock || 0) <= (item.reorderLevel || 0);
            return (
              <TouchableOpacity
                style={styles.itemCard}
                activeOpacity={0.7}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <View style={styles.leftCol}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.badgesRow}>
                    <View style={styles.groupBadge}>
                      <Text style={styles.groupBadgeText}>{item.group || 'Timber'}</Text>
                    </View>
                    <Text style={styles.hsnText}>HSN: {item.hsn || '4407'}</Text>
                    <Text style={styles.unitText}>Unit: {item.unit || 'CFT'}</Text>
                  </View>
                </View>

                <View style={styles.rightCol}>
                  <Text style={styles.rateText}>{formatINR(item.saleRate || 0)} / {item.unit || 'CFT'}</Text>
                  <View style={[styles.stockBadge, isLowStock ? styles.lowStockBadge : null]}>
                    <Ionicons
                      name={isLowStock ? 'alert-circle' : 'cube-outline'}
                      size={12}
                      color={isLowStock ? colors.errorText : colors.navyDark}
                      style={{ marginRight: 3 }}
                    />
                    <Text style={[styles.stockText, isLowStock ? styles.lowStockText : null]}>
                      Stock: {item.currentStock || 0} {item.unit}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color={colors.borderDark} />
              <Text style={styles.emptyText}>No matching timber items found</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceBg
  },
  header: {
    backgroundColor: colors.navyPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    height: 46
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24
  },
  itemCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border
  },
  leftCol: {
    flex: 1,
    paddingRight: 10
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 8
  },
  groupBadge: {
    backgroundColor: colors.surfaceBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: colors.border
  },
  groupBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  hsnText: {
    fontSize: 11,
    color: colors.textMuted
  },
  unitText: {
    fontSize: 11,
    color: colors.textMuted
  },
  rightCol: {
    alignItems: 'flex-end'
  },
  rateText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.goldDark
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceBg,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 5
  },
  lowStockBadge: {
    backgroundColor: colors.errorBg
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navyPrimary
  },
  lowStockText: {
    color: colors.errorText
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textMuted
  }
});
